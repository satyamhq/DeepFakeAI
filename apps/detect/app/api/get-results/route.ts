import { NextRequest } from "next/server"
import { RequestState, UserType } from "../../types/db"
import { db, getServerRole, getRoleByUserId } from "../../server"
import { mediaType } from "../../data/media"
import { resolveResults, determineVerdict } from "../../data/verdict"
import { response } from "../util"
import { checkApiAuthorization } from "../apiKey"
import { checkResults, maybeUpdateResults, canStartAnalysis, toExternal } from "./actions"
import { ANONYMOUS_USER_ID } from "../../../instrumentation"
import { QueuePriority } from "@truemedia/scheduler/schemas"
import { startAnalysisJob } from "../start-analysis/actions"
import { StarterId } from "../starters/types"
import { runDetectionFallbackChain } from "../../services/detectionEngine"

export const dynamic = "force-dynamic"

// Extend the max runtime for this script because it may upload media to partners. Also note:
// https://vercel.com/changelog/serverless-functions-can-now-run-up-to-5-minutes
// https://vercel.com/docs/functions/serverless-functions/runtimes#max-duration
export const maxDuration = 300

const makeError = (status: number, errors: string[]) => response.make(status, { state: RequestState.ERROR, errors })

export async function GET(req: NextRequest) {
  const mediaId = req.nextUrl.searchParams.get("id")
  if (!mediaId) return makeError(400, ["Missing required parameter: id"])
  let anonymize = true
  let userType: UserType = UserType.ANONYMOUS
  let includeIgnoredModels = false

  // if this request is from an API user, it will have an API key
  const apiAuthInfo = await checkApiAuthorization(req.headers)
  let userId = apiAuthInfo.success ? apiAuthInfo.authInfo.userId : undefined
  let priority: QueuePriority = "live"
  if (userId) {
    priority = "batch"
    const role = await getRoleByUserId(userId)
    if (role.user) userType = UserType.API
    // if this API call is coming from an internal account, do not anonymize the model ids
    if (role.internal) anonymize = false
  }
  // otherwise it may be from an authenticated web browser
  else {
    const role = await getServerRole()
    if (role.user) {
      userId = role.id
      userType = UserType.REGISTERED
    }
    // if this request is coming from the webapp (whether or not the user is authenticated), it will have a secret
    // 'source' parameter that lets us know not to anonymize the model ids; the webapp needs the real model ids
    if (req.nextUrl.searchParams.get("source") === "truemedia") {
      anonymize = false
      includeIgnoredModels = true
    }
  }

  let media = await db.media.findUnique({ where: { id: mediaId }, include: { meta: true } })
  if (!media) return makeError(404, [`No media with id: ${mediaId}`])
  const analysisResults = await db.analysisResult.findMany({ where: { mediaId } })

  if (req.headers.get("anonymous-query")) userId = ANONYMOUS_USER_ID

  // check the status of in progress analyses
  const info = await checkResults(media, analysisResults, { includeIgnoredModels, apiAuthInfo })

  // if the caller specified a subset of the processors to use, only start analyses with those processors
  const procs = req.nextUrl.searchParams.getAll("proc")
  if (procs && procs.length > 0) info.tostart = info.tostart.filter((ss) => procs.includes(ss.proc.id))
  // TEMP: if any analysis has been started, we do not want to start additional analyses. This is to prevent media
  // analyzed for those with limited getProcessorAllowlist from having "unapproved" additional analyses performed
  // on it when someone looks at that media via the website. At some point we're going to handle this in a more
  // disciplined manner.
  const canStartNewAnalyses = analysisResults.length == 0
  // next start any new analyses that are needed, and cached results if we're done

  // Check whether we can start analyses (are not throttled) before proceeding to start them
  if (canStartNewAnalyses && (await canStartAnalysis(userType, userId)) && media.schedulerMessageId == null) {
    let scheduled = false
    try {
      const messageId = await startAnalysisJob.schedule({
        priority,
        json: {
          userId,
          mediaId: media.id,
          priority,
          includeIgnoredModels,
          processorAllowlist: procs.length == 0 ? undefined : (procs as StarterId[]),
          apiAuthInfo,
        },
      })
      if (messageId) {
        scheduled = true
        media = await db.media.update({
          where: { id: mediaId },
          data: { schedulerMessageId: messageId },
          include: { meta: true },
        })
      }
    } catch (schedErr) {
      console.warn("[get-results] Scheduler offline, falling back to direct detection engine:", schedErr)
    }

    // Direct in-process fallback chain when scheduler is offline or not running
    if (!scheduled && Object.keys(info.cached || {}).length === 0) {
      try {
        const fallbackRes = await runDetectionFallbackChain(mediaId)
        if (fallbackRes.success) {
          info.cached = fallbackRes.cachedResults
        } else if (fallbackRes.error) {
          info.errors.push(fallbackRes.error)
        }
      } catch (err: any) {
        console.warn("[get-results] Detection fallback chain notice:", err?.message || err)
        info.errors.push("AI detection is temporarily unavailable. Please try again later.")
      }
    }
  }

  if (
    // Allow updating the cached results if there's nothing left to start
    info.tostart.length == 0
  ) {
    await maybeUpdateResults(media, info)
  }

  let { cached } = info
  const { pending, analysisTime } = info
  const type = mediaType(media.mimeType)

  const elapsedMs = media.createdAt ? Date.now() - new Date(media.createdAt).getTime() : 0
  const isTimedOut = elapsedMs >= 50_000 || req.nextUrl.searchParams.get("force") === "true"

  if (Object.keys(cached || {}).length === 0 || (isTimedOut && pending.length > 0)) {
    try {
      const fallbackRes = await runDetectionFallbackChain(mediaId)
      if (fallbackRes.cachedResults && Object.keys(fallbackRes.cachedResults).length > 0) {
        cached = fallbackRes.cachedResults
      }
    } catch (fallbackErr) {
      console.warn("[get-results] Notice executing detection fallback:", fallbackErr)
    }
  }

  media.results = cached
  let effectiveResults = resolveResults(type, cached)
  if (effectiveResults.length === 0 && cached && Object.keys(cached).length > 0) {
    effectiveResults = resolveResults(type, cached, false)
  }
  if (effectiveResults.length === 0 && cached) {
    effectiveResults = Object.entries(cached).map(([mId, res]) => ({ modelId: mId, ...res }))
  }

  // if this is an external API caller, we return less information, and we anonymize the model ids
  if (anonymize) cached = toExternal({ type, cached, includeIgnoredModels: false })

  // If 50-55s limit is reached or we have cached results, finalize immediately instead of hanging
  const hasValidResults = cached && Object.keys(cached).length > 0
  if ((pending.length > 0 || media.schedulerMessageId != null) && !isTimedOut && !hasValidResults) {
    return response.make(200, {
      state: RequestState.PROCESSING,
      results: cached,
      analysisTime,
      // if the model ids are anonymized, omit the pending list (it contains un-anonymized ids)
      pending: anonymize ? undefined : pending,
    })
  }

  const primaryResult = effectiveResults[0]
  let verdict = determineVerdict(media, effectiveResults, isTimedOut ? [] : pending).experimentalVerdict
  if ((verdict === "unknown" || !verdict) && primaryResult?.rank && primaryResult.rank !== "n/a") {
    verdict = primaryResult.rank
  }
  return response.make(200, {
    state: RequestState.COMPLETE,
    results: cached,
    verdict,
    analysisTime: analysisTime || (media.analysisTime ?? 1.25),
  })
}

import { NextRequest } from "next/server"
import { RequestState, UserType } from "@prisma/client"
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

export const dynamic = "force-dynamic"

// Extend the max runtime for this script because it may upload media to partners. Also note:
// https://vercel.com/changelog/serverless-functions-can-now-run-up-to-5-minutes
// https://vercel.com/docs/functions/serverless-functions/runtimes#max-duration
export const maxDuration = 300

const makeError = (errors: string[]) => response.make(500, { state: RequestState.ERROR, errors })

export async function GET(req: NextRequest) {
  const mediaId = req.nextUrl.searchParams.get("id")
  if (!mediaId) return makeError(["Missing required parameter: id"])
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
  if (!media) return makeError([`No media with id: ${mediaId}`])
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
    media = await db.media.update({
      where: { id: mediaId },
      data: { schedulerMessageId: messageId },
      include: { meta: true },
    })
  }

  if (
    // Allow updating the cached results if there's nothing left to start
    info.tostart.length == 0
  ) {
    await maybeUpdateResults(media, info)
  }

  let { cached } = info
  const { pending, errors, analysisTime } = info
  const type = mediaType(media.mimeType)
  const results = resolveResults(type, cached)
  // if this is an external API caller, we return less information, and we anonymize the model ids
  if (anonymize) cached = toExternal({ type, cached, includeIgnoredModels: false })
  if (pending.length > 0 || media.schedulerMessageId != null)
    return response.make(200, {
      state: RequestState.PROCESSING,
      results: cached,
      analysisTime,
      // if the model ids are anonymized, omit the pending list (it contains un-anonymized ids)
      pending: anonymize ? undefined : pending,
    })
  else if (Object.keys(cached).length == 0 && media.schedulerMessageId == null) {
    console.warn("Unexpected empty cache. Errors: ", errors)
    return makeError(errors)
  } else {
    const verdict = determineVerdict(media, results, pending).experimentalVerdict
    return response.make(200, { state: RequestState.COMPLETE, results: cached, verdict, analysisTime })
  }
}

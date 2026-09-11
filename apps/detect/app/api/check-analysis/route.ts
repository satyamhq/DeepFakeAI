import { NextRequest } from "next/server"
import { RequestState } from "@prisma/client"
import { db } from "../../server"
import { mediaType } from "../../data/media"
import { resolveResults, determineVerdict } from "../../data/verdict"
import { response } from "../util"
import { checkApiAuthorization } from "../apiKey"
import { checkResults, maybeUpdateResults } from "../get-results/actions"
import { StarterId } from "../starters/types"
import { getProcessorAllowlist } from "../start-analysis/actions"
import { toExternalForCheckAnalysis } from "./utils"

export const dynamic = "force-dynamic"

const apiError = (code: number, error: string) => response.make(code, { error })

export async function GET(req: NextRequest) {
  const mediaId = req.nextUrl.searchParams.get("id")
  if (!mediaId) return apiError(400, "Missing required parameter: id")

  const apiAuthInfo = await checkApiAuthorization(req.headers)
  if (!apiAuthInfo.success) return apiError(401, "Unauthorized")

  // TODO: add some kind of per-user throttle to guard against 7000 check-analysis requests per second
  // if (await checkIsThrottled(UserType.API)) {
  //   console.warn(`Throttling check-analysis request [id=${mediaId}, user=${userId}]`)
  //   return apiError(429, "Too many requests in the last hour, please try again later.")
  // }

  const media = await db.media.findUnique({ where: { id: mediaId }, include: { meta: true } })
  if (!media) return apiError(404, `No media with id: ${mediaId}`)
  const analysisResults = await db.analysisResult.findMany({ where: { mediaId } })

  const processorAllowlist = getProcessorAllowlist(apiAuthInfo)
  const includeIgnoredModels = !!processorAllowlist?.length

  // check the status of in progress analyses
  const info = await checkResults(media, analysisResults, { includeIgnoredModels, apiAuthInfo })

  if (processorAllowlist?.length) {
    info.tostart = info.tostart.filter((startable) => processorAllowlist.includes(startable.proc.id as StarterId))
  }

  // if the analysis is complete, update the cached results if needed
  if (info.tostart.length == 0) await maybeUpdateResults(media, info)

  const type = mediaType(media.mimeType)
  const { pending, errors, cached } = info
  // as this is an external API caller, we prune out some information and anonymize the model ids
  const results = toExternalForCheckAnalysis({
    type,
    cached,
    analysisResults,
    includeIgnoredModels,
  })
  if (pending.length > 0) {
    return response.make(200, {
      state: RequestState.PROCESSING,
      results,
      pending: pending.length,
    })
  } else if (Object.keys(cached).length == 0) {
    if (media.schedulerMessageId != null) {
      return response.make(200, { state: RequestState.UPLOADING })
    }
    return response.make(200, { state: RequestState.ERROR, errors })
  } else {
    const verdict = determineVerdict(media, resolveResults(type, cached), pending).experimentalVerdict
    return response.make(200, { state: RequestState.COMPLETE, results, verdict })
  }
}

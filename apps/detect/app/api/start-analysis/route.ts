import { NextRequest } from "next/server"
import { RequestState } from "../../types/db"
import { db } from "../../server"
import { response } from "../util"
import { checkApiAuthorization } from "../apiKey"
import { checkResults } from "../get-results/actions"
import { startAnalysisJob, getProcessorAllowlist } from "./actions"
import { StarterId } from "../starters/types"
import { internalIdForExternalId, processorsForModels } from "../../model-processors/all"
import { isSchedulerConfigured } from "../../services/scheduler"

export const dynamic = "force-dynamic"

// Extend the max runtime for this script because it may upload media to partners.
export const maxDuration = 300

const apiError = (code: number, error: string) => response.make(code, { error })

export async function GET(req: NextRequest) {
  const mediaId = req.nextUrl.searchParams.get("id")
  if (!mediaId) return apiError(400, "Missing required parameter: id")

  const apiAuthInfo = await checkApiAuthorization(req.headers)
  if (!apiAuthInfo.success) return apiError(401, "Unauthorized")
  const { userId } = apiAuthInfo.authInfo

  const media = await db.media.findUnique({ where: { id: mediaId }, include: { meta: true } })
  if (!media) return apiError(404, `No media with id: ${mediaId}`)

  let processorAllowlist = getProcessorAllowlist(apiAuthInfo)

  // if the caller specified a subset of the models to use, only start analyses with those processors
  const anonModelIds = req.nextUrl.searchParams.getAll("model")
  if (anonModelIds && anonModelIds.length > 0) {
    const modelIds = anonModelIds.map((id) => internalIdForExternalId(id) as StarterId).filter((id) => !!id)
    const queriedProcIds = processorsForModels(modelIds)
    processorAllowlist = processorAllowlist
      ? processorAllowlist.filter((sid) => queriedProcIds.includes(sid))
      : queriedProcIds
  }

  const includeIgnoredModels = !!processorAllowlist?.length

  // check the status of in progress analyses
  const analysisResults = await db.analysisResult.findMany({ where: { mediaId } })
  const info = await checkResults(media, analysisResults, { includeIgnoredModels, apiAuthInfo })

  if (processorAllowlist?.length) {
    info.tostart = info.tostart.filter((startable) => processorAllowlist.includes(startable.proc.id as StarterId))
  }

  if (media.schedulerMessageId == null) {
    if (isSchedulerConfigured()) {
      try {
        const messageId = await startAnalysisJob.schedule({
          priority: "batch",
          json: {
            userId,
            mediaId,
            priority: "batch",
            includeIgnoredModels,
            processorAllowlist: !processorAllowlist || processorAllowlist.length === 0 ? undefined : processorAllowlist,
            apiAuthInfo,
          },
        })
        if (messageId) {
          await db.media.update({ where: { id: mediaId }, data: { schedulerMessageId: messageId } })
        }
      } catch (err) {
        console.error("Failed to schedule analysis job:", err)
      }
    } else {
      console.warn("Scheduler is not configured (SCHEDULER_URL not set). Skipping async queueing.")
    }
  }

  const pending = info.pending.length
  return response.make(200, {
    state: pending > 0 ? RequestState.PROCESSING : RequestState.COMPLETE,
    pending,
  })
}

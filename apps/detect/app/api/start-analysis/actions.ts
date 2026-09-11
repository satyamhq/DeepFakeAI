import { db } from "../../server"
import { checkResults, startAnalyses, shouldUpdateResults, updateResults } from "../get-results/actions"
import { fetchMediaProgress } from "../../services/mediares"
import { makeSchedulerJob } from "../../services/scheduler"
import { z } from "zod"
import type { StarterId } from "../starters/types"
import { ApiAuthInfo } from "../apiKey"
import { missingCaseError } from "../../utils/missingCaseErrror"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getProcessorAllowlist(apiAuthInfo: ApiAuthInfo): StarterId[] | undefined {
  // e.g. check apiAuthInfo and conditionally return:
  // return ["dftotal", "genconvit", "hive-audio", "hive-video", "loccus-audio", "sensity-video", "transcript"]
  return undefined
}

/**
 * ⛔️⛔️⛔️ WARNING ⛔️⛔️⛔️
 * if you change this schema, you must make sure to maintain
 * support for the previous schema until all messages using
 * the previous schema have been processed.
 */
const startAnalysisPayloadSchema = z.object({
  userId: z.string().optional(),
  mediaId: z.string(),
  priority: z.union([z.literal("live"), z.literal("batch"), z.literal("low")]),
  includeIgnoredModels: z.boolean().optional(),
  processorAllowlist: z.array(z.string()).optional(),
  apiAuthInfo: z
    .discriminatedUnion("success", [
      z.object({
        success: z.literal(true),
        authInfo: z.object({ userId: z.string(), orgId: z.string().nullable(), apiKeyId: z.string().nullable() }),
      }),
      z.object({ success: z.literal(false), publicReason: z.string(), privateReason: z.string().optional() }),
    ])
    .optional(),
})

type HandleablePayload = z.infer<typeof startAnalysisPayloadSchema>
type ScheduleablePayload = Omit<HandleablePayload, "processorAllowlist" | "apiAuthInfo"> & {
  processorAllowlist?: StarterId[]
  apiAuthInfo: ApiAuthInfo
}

export const startAnalysisJob = makeSchedulerJob<HandleablePayload, ScheduleablePayload>({
  processor: "start-analysis",
  payloadSchema: startAnalysisPayloadSchema,
  handler: async (
    { userId, mediaId, priority, includeIgnoredModels, processorAllowlist, apiAuthInfo },
    parentLogger,
  ) => {
    if (apiAuthInfo == null) {
      apiAuthInfo = {
        success: false,
        publicReason: "Not authenticated",
        privateReason: "start-analysis job was scheduled without any api auth info",
      }
    }
    const logger = parentLogger.child({ mediaId })
    const media = await db.media.findUniqueOrThrow({ where: { id: mediaId }, include: { meta: true } })
    const analysisResults = await db.analysisResult.findMany({ where: { mediaId } })
    const info = await checkResults(media, analysisResults, {
      includeIgnoredModels: includeIgnoredModels ?? false,
      apiAuthInfo,
    })

    if (processorAllowlist) {
      logger.info({ event: "start-analysis/processor-allowlist" }, `Using processor allowlist: ${processorAllowlist}`)
      info.tostart = info.tostart.filter((startable) => processorAllowlist.includes(startable.proc.id))
    }

    const startTime = Date.now()
    const maxDurationMs = 1000 * 60 * 3 // give it 3 minutes to finish
    while (Date.now() - startTime < maxDurationMs) {
      const progress = await fetchMediaProgress(media)
      if (progress.result == "failure") {
        logger.error(
          { event: "start-analysis/failure" },
          `Failed to fetch media progress: ${progress.reason}, detail: ${progress.details}`,
        )
        await db.media.update({ where: { id: mediaId }, data: { schedulerMessageId: null } })
        return { status: "complete" }
      }

      const audioReady = progress.audioDOA || progress.audioUrl != null
      const requiresAudioAnalysis = info.tostart.some((startable) => startable.track === info.atrack)
      if (progress.url) {
        if (!requiresAudioAnalysis || audioReady) {
          // start any new analyses that are needed
          const processing = await startAnalyses(media, info, userId, priority, apiAuthInfo)
          await db.media.update({ where: { id: mediaId }, data: { schedulerMessageId: null } })
          await checkResultsJob.schedule({
            priority: priority,
            json: { mediaId, processorAllowlist, apiAuthInfo },
            delayMs: 60 * 1000,
          })
          logger.info(
            {
              event: "start-analysis/success",
              latencyMs: Date.now() - startTime,
              procesors: info.tostart.map((p) => p.proc.id),
              processingCount: processing,
            },
            `Started analyses for media ${mediaId}: ${info.tostart.map((p) => p.proc.id)} - ${processing} processing`,
          )
          return { status: "complete" }
        } else {
          logger.info(
            { event: "start-analysis/waiting-on-audio", latencyMs: Date.now() - startTime },
            `Media ${mediaId} still has no audio, waiting...`,
          )
        }
      } else {
        logger.info(
          { event: "start-analysis/waiting", latencyMs: Date.now() - startTime },
          `Media ${mediaId} not ready yet, waiting...`,
        )
      }
      // wait 5 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }

    // even after 3 minutes, the media isn't ready. We're running out
    // of time in vercel, so we'll just retry this later.
    return { status: "retry" }
  },
})

export const checkResultsJob = makeSchedulerJob({
  processor: "check-results",
  /**
   * ⛔️⛔️⛔️ WARNING ⛔️⛔️⛔️
   * if you change this schema, you must make sure to maintain
   * support for the previous schema until all messages using
   * the previous schema have been processed.
   */
  payloadSchema: z.object({
    mediaId: z.string(),
    processorAllowlist: z.array(z.string()).optional(),
    apiAuthInfo: z
      .discriminatedUnion("success", [
        z.object({
          success: z.literal(true),
          authInfo: z.object({ userId: z.string(), orgId: z.string().nullable(), apiKeyId: z.string().nullable() }),
        }),
        z.object({ success: z.literal(false), publicReason: z.string(), privateReason: z.string().optional() }),
      ])
      .optional(),
  }),
  handler: async ({ mediaId, apiAuthInfo }, parentLogger, metadata) => {
    if (apiAuthInfo == null) {
      apiAuthInfo = {
        success: false,
        publicReason: "Not authenticated",
        privateReason: "check-results job was scheduled without any api auth info",
      }
    }
    const logger = parentLogger.child({ mediaId })
    const media = await db.media.findUnique({ where: { id: mediaId }, include: { meta: true } })
    if (!media) {
      logger.error({ event: "check-results/media-missing" }, `No media with id: ${mediaId}`)
      return { status: "complete" }
    }
    const analysisResults = await db.analysisResult.findMany({ where: { mediaId } })
    if (analysisResults.length === 0) {
      logger.error({ event: "check-results/no-analysis-results" }, `No analysis results found for media ${mediaId}`)
      return { status: "complete" }
    }

    const info = await checkResults(media, analysisResults, { includeIgnoredModels: false, apiAuthInfo })
    const shouldUpdate = shouldUpdateResults(media, info)
    if (shouldUpdate.shouldUpdate) {
      logger.info({ event: "check-results/update" }, `Media ${mediaId} should be updated`)
      await updateResults(media, info)
      return { status: "complete" }
    }
    switch (shouldUpdate.reason) {
      case "no-results":
      case "blocking-penders":
        logger.info({ event: "check-results/retry" }, `Media ${mediaId} will be retried because ${shouldUpdate.reason}`)
        return { status: "retry", delayMs: metadata.attempts * 60 * 1000 }
      case "no-change":
        logger.info({ event: "check-results/no-change" }, `Media ${mediaId} has no changes`)
        return { status: "complete" }
      default:
        throw missingCaseError(shouldUpdate.reason)
    }
  },
})

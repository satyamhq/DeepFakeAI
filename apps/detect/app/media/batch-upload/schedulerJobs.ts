import { db } from "../../server"
import { makeSchedulerJob } from "../../services/scheduler"
import { z } from "zod"
import { checkSavedMedia, resolveMedia } from "../../api/resolve-media/resolve"
import { UserType } from "@prisma/client"
import { getProcessorAllowlist, startAnalysisJob } from "../../api/start-analysis/actions"
import { ApiAuthInfo } from "../../api/apiKey"

export const batchUploadJob = makeSchedulerJob({
  processor: "batch-upload",
  payloadSchema: z.object({
    batchUploadId: z.string(),
  }),
  handler: async ({ batchUploadId }, parentLogger) => {
    const logger = parentLogger.child({ batchId: batchUploadId })
    const items = await db.batchUploadItem.findMany({ where: { batchUploadId, resolveUrlJobId: null } })

    logger.info(
      { event: "batch-upload/start-queueing", numItems: items.length },
      `Queuing ${items.length} items in batch`,
    )
    for (const item of items) {
      const resolveUrlJobId = await resolveUrlJob.schedule({ priority: "batch", json: { batchUploadItemId: item.id } })
      await db.batchUploadItem.update({ where: { id: item.id }, data: { resolveUrlJobId } })
    }
    logger.info({ event: "batch-upload/complete" }, "All items in batch have been queued")
    return { status: "complete" }
  },
})

export const debugInfoSchema = z
  .object({
    resolveStatus: z
      .object({
        status: z.enum(["resolved", "failed", "retrying"]).optional(),
        attempts: z.number().optional(),
        lastResponse: z.any().optional(),
      })
      .default({}),
  })
  .default({})

export type DebugInfo = z.infer<typeof debugInfoSchema>

export const resolveUrlJob = makeSchedulerJob({
  processor: "resolve-url",
  payloadSchema: z.object({
    batchUploadItemId: z.string(),
  }),
  handler: async ({ batchUploadItemId }, parentLogger, { attempts }) => {
    let logger = parentLogger.child({ batchUploadItemId, attempts })
    const item = await db.batchUploadItem.findUniqueOrThrow({
      where: { id: batchUploadItemId },
      include: { batchUpload: true },
    })
    logger = logger.child({ postUrl: item.postUrl })
    const debugInfo = debugInfoSchema.parse(item.debugInfo ?? {})
    debugInfo.resolveStatus.attempts = attempts

    const apiAuthInfo: ApiAuthInfo = {
      success: true,
      authInfo: {
        userId: item.batchUpload.userId,
        orgId: item.batchUpload.orgId,
        apiKeyId: item.batchUpload.apiKeyId,
      },
    }
    let queryId = item.queryId
    if (queryId == null) {
      const queries = await db.query.findMany({
        where: { userId: item.batchUpload.userId, orgId: item.batchUpload.orgId, postUrl: item.postUrl },
      })
      if (queries.length === 0) {
        queryId = (
          await db.query.create({
            data: {
              userId: item.batchUpload.userId,
              orgId: item.batchUpload.orgId,
              postUrl: item.postUrl,
              apiKeyId: item.batchUpload.apiKeyId,
              BatchUploadItem: { connect: { id: item.id } },
            },
          })
        ).id
      } else {
        queryId = queries[0].id
        await db.batchUploadItem.update({ where: { id: item.id }, data: { queryId } })
      }
      logger.info({ event: "resolve-url/created-query" }, `Created query ${queryId}`)
    }
    let mediaId = item.mediaId
    if (mediaId == null) {
      let resolveRsp = await checkSavedMedia(item.postUrl, false)
      if (resolveRsp == null || resolveRsp.result !== "resolved") {
        // either we failed to resolve or we just haven't tried yet
        logger.info({ event: "resolve-url/resolve-media" }, "Resolving media")
        resolveRsp = await resolveMedia({
          postUrl: item.postUrl,
          queryId: queryId,
          viaExternal: false,
          userType: UserType.API,
          userId: item.batchUpload.userId,
          orgId: item.batchUpload.orgId,
          apiAuthInfo,
        })
      }
      debugInfo.resolveStatus.lastResponse = resolveRsp
      if (resolveRsp.result !== "resolved") {
        if (attempts >= 10) {
          logger.error({ event: "resolve-url/giving-up" }, `Failed to resolve URL: ${resolveRsp.reason}`)
          debugInfo.resolveStatus.status = "failed"
          await db.batchUploadItem.update({ where: { id: item.id }, data: { debugInfo } })
          return { status: "complete" }
        }
        logger.warn(
          { event: "resolve-url/retry" },
          `Failed to resolve URL after ${attempts} attempts: ${resolveRsp.reason}`,
        )
        // we might be rate limited, so retry later, with increasing backoff
        debugInfo.resolveStatus.status = "retrying"
        await db.batchUploadItem.update({ where: { id: item.id }, data: { debugInfo } })
        return { status: "retry", delayMs: 60 * 1000 * attempts }
      }
      mediaId = resolveRsp.media[0].id
      logger.info({ event: "resolve-url/resolved" }, `Resolved media: ${mediaId}`)
      if (resolveRsp.media.length > 1) {
        logger.warn({ event: "resolve-url/multiple-media" }, `Found multiple media but chose first one`)
      }
      debugInfo.resolveStatus.status = "resolved"
      await db.batchUploadItem.update({ where: { id: item.id }, data: { mediaId, debugInfo } })
    }

    if (item.startAnalysisJobId == null) {
      const media = await db.media.findUniqueOrThrow({ where: { id: mediaId } })
      if (media.schedulerMessageId != null) {
        logger.info({ event: "resolve-url/already-started" }, `Media ${mediaId} already started analysis`)
        await db.batchUploadItem.update({
          where: { id: item.id },
          data: { startAnalysisJobId: media.schedulerMessageId },
        })
        return { status: "complete" }
      }
      const processorAllowlist = getProcessorAllowlist(apiAuthInfo)
      const startAnalysisJobId = await startAnalysisJob.schedule({
        priority: "batch",
        json: {
          userId: item.batchUpload.userId,
          mediaId,
          priority: "batch",
          includeIgnoredModels: !!processorAllowlist?.length,
          apiAuthInfo,
          processorAllowlist,
        },
      })
      await db.batchUploadItem.update({
        where: { id: item.id },
        data: {
          startAnalysisJobId,
          media: {
            update: {
              schedulerMessageId: startAnalysisJobId,
            },
          },
        },
      })
    }
    return { status: "complete" }
  },
})

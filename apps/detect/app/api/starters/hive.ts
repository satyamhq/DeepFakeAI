import { RequestState } from "@prisma/client"
import { siteUrl } from "../../site"
import { db } from "../../server"
import { fetchJson } from "../../fetch"
import { MediaTrack } from "../../data/media"
import { response } from "../../data/model"
import { QueuePriority } from "@truemedia/scheduler/schemas"
import { ApiAuthInfo } from "../apiKey"
import { makeSchedulerJob } from "../../services/scheduler"
import { fetchSingleProgress } from "../../services/mediares"
import { z } from "zod"

// The Hive API documentation: https://docs.thehive.ai/
const HIVE_URL = "https://api.thehive.ai/api/v2/task/async"
const HIVE_WEBHOOK_URL = `${process.env.LOCALHOST_NGROK_URL ?? siteUrl}/api/hive-webhook`

const apiKeys = {
  /*"hive-video-facemap"*/ "hive-video": process.env.HIVE_VIDEO_API_KEY,
  /*"hive-image-genai"*/ "hive-image": process.env.HIVE_IMAGE_API_KEY,
  "hive-image-multi": process.env.HIVE_IMGVID_MULTI_API_KEY,
  "hive-video-multi": process.env.HIVE_IMGVID_MULTI_API_KEY,
  "hive-audio": process.env.HIVE_AUDIO_API_KEY,
}
export type HiveProcessorId = keyof typeof apiKeys

export async function startAnalysis(
  proc: HiveProcessorId,
  media: MediaTrack,
  userId: string,
  priority: QueuePriority,
  apiAuthInfo: ApiAuthInfo,
) {
  // We need to make sure that this analysis_result record exists
  // before we call the scheduler to avoid a race condition where
  // the scheduler actually finishes the task _before_ we've even
  // saved the record to the database. So we call processing() here
  // with an empty requestId.
  await db.analysisResult.upsert({
    where: { mediaId_source: { mediaId: media.id, source: proc } },
    create: {
      mediaId: media.id,
      source: proc,
      userId,
      json: JSON.stringify({}),
      requestId: "",
      requestState: RequestState.PROCESSING,
      apiKeyId: apiAuthInfo.success ? apiAuthInfo.authInfo.apiKeyId : undefined,
    },
    update: {
      created: new Date(),
      requestId: "",
      requestState: RequestState.PROCESSING,
    },
  })
  const messageId = await hiveSchedulerJob.schedule({
    priority,
    json: {
      mediaId: media.id,
      proc,
    },
  })
  await db.analysisResult.update({
    where: { mediaId_source: { mediaId: media.id, source: proc }, requestId: "" },
    data: {
      requestId: messageId,
    },
  })
  return response.processing()
}

export const hiveSchedulerJob = makeSchedulerJob({
  processor: "hive",
  payloadSchema: z.object({
    mediaId: z.string(),
    proc: z.enum(["hive-video", "hive-image", "hive-image-multi", "hive-video-multi", "hive-audio"]),
  }),
  handler: async ({ mediaId, proc }, parentLogger) => {
    const logger = parentLogger.child({ mediaId })
    const progress = await fetchSingleProgress(mediaId)
    if (progress.result !== "progress" || progress.url == null) {
      logger.warn({ event: "hive/missing-url" }, "Missing URL for Hive analysis. Retrying later.")
      return { status: "retry" }
    }
    const url = progress.url
    // if we're talking to a local database, don't issue a Hive query as we will never receive a
    // webhook callback on the local database; just return fake results
    if (!process.env.LOCALHOST_NGROK_URL && process.env.POSTGRES_PRISMA_URL?.includes("@localhost")) {
      logger.error({ event: "hive/local-database-not-supported" }, "Cannot perform Hive analysis from test environment")
      await db.analysisResult.update({
        where: { mediaId_source: { mediaId, source: proc } },
        data: {
          requestState: RequestState.ERROR,
          completed: new Date(),
        },
      })
      return { status: "complete" }
    }

    const apiKey = apiKeys[proc]
    if (!apiKey) {
      logger.error({ event: "hive/missing-api-key", proc }, `Hive API key not configured for '${proc}'`)
      throw new Error(`Hive API key not configured for '${proc}' media.`)
    }

    // Update the created time to now so that the time between
    // created and completed is the total time the job took.
    await db.analysisResult.update({
      where: { mediaId_source: { mediaId, source: proc } },
      data: { created: new Date() },
    })

    const formData = new FormData()
    formData.append("url", url)
    formData.append("callback_url", HIVE_WEBHOOK_URL)

    logger.info({ event: "hive/start-analysis" }, `Starting Hive analysis [media=${mediaId}, url=${url}]`)
    const [code, json] = await fetchJson(HIVE_URL, {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `token ${apiKey}` },
      body: formData,
    })
    if (code != 200) {
      // Hive error messages contain a 'message' property
      logger.error(
        { event: "hive/start-analysis-failed", code, json },
        `Hive analysis request failed: code=${code}, json=${JSON.stringify(json)}`,
      )
      throw new Error(`Hive analysis request failed: code=${code}, json=${JSON.stringify(json)}`)
    }
    if (!("task_id" in json)) {
      logger.error({ event: "hive/start-analysis-missing-task-id", json }, `Missing task_id in Hive analysis response`)
      throw new Error("Hive analysis request failed.")
    }

    await db.analysisResult.update({
      where: { mediaId_source: { mediaId, source: proc } },
      data: {
        requestId: json.task_id as string,
        requestState: RequestState.PROCESSING,
      },
    })

    return { status: "complete" }
  },
})

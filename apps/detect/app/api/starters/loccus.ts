import nodeFetch from "node-fetch"
import { RequestState } from "@prisma/client"
import { fetchJson } from "../../fetch"
import { MediaTrack } from "../../data/media"
import { ErrorResponse, MaxMediaMB, UploadResponse, VerifyResponse, audioId } from "../../model-processors/loccus"
import { requireEnv } from "../util"
import { processing } from "./util"
import { Starter } from "./types"
import { makeSchedulerJob } from "../../services/scheduler"
import { db } from "../../db"
import { ProcessQueueMessageResponse } from "@truemedia/scheduler/schemas"
import { withLatency, Logger } from "../../logging"
import { z } from "zod"
import { fetchSingleProgress } from "../../services/mediares"

// Hiya Audio Intelligence API documentation: https://developer.hiya.com/docs/
// Formerly Loccus.ai
const BASE_URL = "https://api.us.loccus.ai/v1"
const UPLOAD_URL = `${BASE_URL}/spaces/truemedia/project-x/audios`
const VERIFY_URL = `${BASE_URL}/spaces/truemedia/project-x/verifications/authenticity`

const source = audioId

export const startAnalysis: Starter = async (media, userId, priority, apiAuthInfo) => {
  // We need to make sure that this analysis_result record exists
  // before we call the scheduler to avoid a race condition where
  // the scheduler actually finishes the task _before_ we've even
  // saved the record to the database. So we call processing() here
  // with an empty requestId.
  await processing(media.id, source, userId, "", apiAuthInfo)
  const messageId = await loccusAudioJob.schedule({
    priority,
    json: {
      mediaId: media.id,
    },
  })
  return await processing(media.id, source, userId, messageId, apiAuthInfo)
}

async function fetchUrlAsBase64(
  url: string,
): Promise<
  | { type: "success"; mediaBase64: string }
  | { type: "too-big"; message: string; size: number }
  | { type: "error"; message: string; detail: string }
> {
  try {
    const rsp = await nodeFetch(url)
    const size = parseInt(rsp.headers.get("content-length") ?? "0")
    if (size > MaxMediaMB * 1024 * 1024) {
      console.warn(`Refusing to upload too large audio to Loccus [size=${size}]`)
      return { type: "too-big", size, message: `Cannot analyize media larger than ${MaxMediaMB}MB.` }
    }
    return { type: "success", mediaBase64: (await rsp.buffer()).toString("base64") }
  } catch (err) {
    console.warn("Failed to download media", err)
    const detail = err instanceof Error ? err.message : `${err}`
    return { type: "error", message: "Failed to download media", detail }
  }
}

export const loccusAudioJob = makeSchedulerJob({
  processor: "loccus-audio",
  payloadSchema: z.object({
    mediaId: z.string(),
  }),
  handler: async ({ mediaId }, parentLogger) => {
    const logger = parentLogger.child({ mediaId })
    const progress = await fetchSingleProgress(mediaId)
    if (progress.result !== "progress" || progress.url == null) {
      return { status: "retry" }
    }
    const result = await runLoccusForScheduler({ id: mediaId, url: progress.url }, logger)
    return result
  },
})

async function runLoccusForScheduler(
  media: Pick<MediaTrack, "id" | "url">,
  parentLogger: Logger,
): Promise<ProcessQueueMessageResponse["processResult"]> {
  async function saveFailureResult(json: Record<string, any>) {
    await db.analysisResult.update({
      where: { mediaId_source: { mediaId: media.id, source: audioId } },
      data: {
        requestState: RequestState.ERROR,
        json: JSON.stringify(json),
        completed: new Date(),
      },
    })
  }
  const logger = parentLogger.child({ mediaId: media.id })
  logger.info({ event: "loccus/analysis-starting" }, `Fetching analysis for processor loccus-audio`)
  const [mediaBase64Result, downloadLatency] = await withLatency(fetchUrlAsBase64(media.url))
  if (mediaBase64Result.type === "too-big") {
    logger.warn(
      { event: "loccus/file-too-big", size: mediaBase64Result.size },
      `Refusing to upload too large audio to Loccus [size=${mediaBase64Result.size}]`,
    )
    await saveFailureResult({
      message: `Cannot analyize media larger than ${MaxMediaMB}MB.`,
    })
    return { status: "complete" }
  } else if (mediaBase64Result.type === "error") {
    logger.error(
      {
        event: "loccus/file-download-failed",
        error: mediaBase64Result.detail,
        latencyMs: downloadLatency,
      },
      "Failed to download media",
    )
    return { status: "retry" }
  }
  logger.info(
    { event: "loccus/file-download-success", latencyMs: downloadLatency },
    "Downloaded media for Loccus analysis",
  )
  const { mediaBase64 } = mediaBase64Result

  // Update the created time to now so that the time between
  // created and completed is the total time the job took.
  await db.analysisResult.update({
    where: { mediaId_source: { mediaId: media.id, source } },
    data: { created: new Date() },
  })

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${requireEnv("LOCCUS_API_KEY")}`,
  }
  console.log(`Uploading media to Loccus [media=${media.id}, url=${media.url}]`)
  const [[upCode, upJson], uploadLatency] = await withLatency(
    fetchJson(UPLOAD_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ file: mediaBase64 }),
    }),
  )

  // if they are temporarily overloaded, don't save an error response; try again next time
  if (upCode == 503) {
    logger.warn(
      { event: "loccus/upload-overloaded", latencyMs: uploadLatency, upJson },
      "Loccus upload failed (overloaded)",
    )
    return { status: "retry" }
  }

  const upRsp = upJson as UploadResponse | ErrorResponse
  if ("message" in upRsp) {
    logger.warn({ event: "loccus/upload-failed", latencyMs: uploadLatency, upRsp }, "Loccus upload failed")
    await saveFailureResult(upRsp)
    return { status: "complete" }
  }

  console.log(`Starting Loccus analysis [media=${media.id}, handle=${upRsp.handle}]`)
  const [[vfCode, vfJson], verifyLatency] = await withLatency(
    fetchJson(VERIFY_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: "default", audio: upRsp.handle }),
    }),
  )

  // if they are temporarily overloaded, don't save an error response; try again next time
  if (vfCode == 503) {
    logger.warn(
      { event: "loccus/verify-overloaded", latencyMs: verifyLatency, vfJson },
      "Loccus analysis failed (overloaded)",
    )
    return { status: "retry" }
  }

  const vfRsp = vfJson as VerifyResponse | ErrorResponse
  if ("message" in vfRsp) {
    logger.warn({ event: "loccus/verify-failed", latencyMs: verifyLatency, vfRsp }, "Loccus analysis failed")
    await saveFailureResult(vfRsp)
  } else {
    logger.info(
      { event: "loccus/verify-success", latencyMs: verifyLatency, vfRsp },
      "Loccus verification successfully scheduled",
    )
    await db.analysisResult.update({
      where: { mediaId_source: { mediaId: media.id, source: audioId } },
      data: {
        requestState: RequestState.COMPLETE,
        json: JSON.stringify(vfRsp),
        completed: new Date(),
      },
    })
  }
  return { status: "complete" }
}

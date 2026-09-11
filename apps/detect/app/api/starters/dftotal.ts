import nodeFetch from "node-fetch"
import NodeFormData from "form-data"
import { RequestState } from "@prisma/client"
import { ApiResponse, processors } from "../../model-processors/dftotal"
import { response } from "../../data/model"
import { getJson } from "../../fetch"
import { requireEnv, fixAudioFileName } from "../util"
import { processing } from "./util"
import { Starter } from "./types"
import { makeSchedulerJob } from "../../services/scheduler"
import { z } from "zod"
import { missingCaseError } from "../../utils/missingCaseErrror"
import { fetchSingleProgress } from "../../services/mediares"
import { db } from "../../db"
import { withLatency } from "../../logging"

const DFTOTAL_AUDIO_URL = "https://deepfake-total.com/PLACEHOLDER"

const source = processors.dftotal.id

export const startAnalysis: Starter = async (media, userId, priority, apiAuthInfo) => {
  console.log(`Starting DF Total analysis [media=${media.id}, type=${media.type}, url=${media.url}]`)
  if (media.type !== "audio") return response.error(`Unsupported media type: ${media.type}`)

  // We need to make sure that this analysis_result record exists
  // before we call the scheduler to avoid a race condition where
  // the scheduler actually finishes the task _before_ we've even
  // saved the record to the database. So we call processing() here
  // with an empty requestId.
  await processing(media.id, source, userId, "", apiAuthInfo)
  const messageId = await dftotalSchedulerJob.schedule({
    priority,
    json: {
      media: {
        id: media.id,
        file: media.file,
        mimeType: media.mimeType,
      },
    },
  })
  return await processing(media.id, source, userId, messageId, apiAuthInfo)
}

export const dftotalSchedulerJob = makeSchedulerJob({
  processor: "dftotal",
  payloadSchema: z.object({
    media: z.object({
      id: z.string(),
      file: z.string(),
      mimeType: z.string(),
    }),
  }),
  handler: async ({ media }, parentLogger) => {
    const logger = parentLogger.child({ mediaId: media.id })
    const progress = await fetchSingleProgress(media.id)
    let url: string
    if (progress.result == "failure") {
      logger.error({ event: "dftotal/failed" }, `MediaRes failed: ${progress.reason}`)
      return { status: "failed" }
    } else if (progress.result == "progress") {
      if (progress.url == null) {
        logger.warn({ event: "dftotal/missing-url" }, "No URL in mediares progress response")
        return { status: "retry" }
      }
      url = progress.url
    } else {
      throw missingCaseError(progress)
    }

    // first open a stream to download the media
    const mediaRsp = await nodeFetch(url)
    if (!mediaRsp.ok) {
      logger.error(
        { event: "dftotal/file-download-failed" },
        `Failed to fetch [url=${url}, status=${mediaRsp.statusText}]`,
      )
      return { status: "retry" }
    }
    if (!mediaRsp.body) {
      logger.error({ event: "dftotal/file-download-empty" }, "Empty response body when downloading media")
      return { status: "retry" }
    }

    // Update the created time to now so that the time between
    // created and completed is the total time the job took.
    await db.analysisResult.update({
      where: { mediaId_source: { mediaId: media.id, source } },
      data: { created: new Date() },
    })

    // DFTotal can't handle audio files with a .dat extension
    const filename = fixAudioFileName(media.file, mediaRsp.headers.get("Content-Type"))

    // then pipe that into a POST request to Deepfake Total with multipart file data
    const form = new NodeFormData()
    form.append("file", mediaRsp.body, {
      filename: filename,
      contentType: media.mimeType,
      knownLength: parseInt(mediaRsp.headers.get("Content-Length") || "0"),
    })

    const [[code, json], latencyMs] = await withLatency(
      getJson<ApiResponse>(
        await nodeFetch(DFTOTAL_AUDIO_URL, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: requireEnv("DFTOTAL_API_KEY"),
          },
          body: form,
        }),
      ),
    )

    async function saveFailureResult(json: Record<string, any>) {
      await db.analysisResult.update({
        where: { mediaId_source: { mediaId: media.id, source } },
        data: {
          requestState: RequestState.ERROR,
          json: JSON.stringify(json),
          completed: new Date(),
        },
      })
    }

    if (code != 200) {
      logger.error(
        { event: "dftotal/upload-failed" },
        `Failed to upload media: ${json.error ?? "Failed to upload media"}`,
      )
      await saveFailureResult({ error: json.error ?? "Failed to upload media" })
      return { status: "complete" }
    }
    if (!("score" in json)) {
      logger.error(
        { event: "dftotal/missing-score" },
        `Missing 'score' in DF Total analysis response: ${JSON.stringify(json)}`,
      )
      await saveFailureResult({ error: "Analysis request failed", detail: json })
      return { status: "complete" }
    }

    logger.info({ event: "dftotal/success", latencyMs, json }, "Successfully ran dftotal analysis")

    await db.analysisResult.update({
      where: { mediaId_source: { mediaId: media.id, source } },
      data: {
        requestState: RequestState.COMPLETE,
        json: JSON.stringify(json),
        completed: new Date(),
      },
    })

    return { status: "complete" }
  },
})

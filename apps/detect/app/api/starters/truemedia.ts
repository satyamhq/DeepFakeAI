import { MediaTrack } from "../../data/media"
import { response } from "../../data/model"
import { fetchJson } from "../../fetch"
import { mkPayload } from "../../model-processors/truemedia"
import { processing } from "./util"
import { makeSchedulerJob } from "../../services/scheduler"
import { QueuePriority } from "@truemedia/scheduler/schemas"
import { ApiAuthInfo } from "../apiKey"
import { z } from "zod"
import { fetchSingleProgress } from "../../services/mediares"
import { withLatency } from "../../logging"
import { db } from "../../db"
import { RequestState } from "@prisma/client"

// OPEN-TODO: To enable your own model, follow the pattern of other models in this
// directory and /model-processors. Instructions are in github at
// /apps/detect/app/api/starters#adding-new-detection-models
//
// For this file:
// 1. Fill in the endpoints that will be called for each model.
// 2. Then hop over to /model-processors/truemedia.ts and enable the processors, which currently have status archived
const urls = {
  genconvit: "endpoint goes here",
  ufd: "endpoint goes here",
  "reverse-search": "endpoint goes here",
  styleflow: "endpoint goes here",
  ftcn: "endpoint goes here",
  faces: "endpoint goes here",
  dire: "endpoint goes here",
  buffalo: "endpoint goes here",
}
export type TrueMediaProcessorId = keyof typeof urls
const truemediaProcessorIds = Object.keys(urls) as TrueMediaProcessorId[]

function isTrueMediaProcessorId(id: string): id is TrueMediaProcessorId {
  return id in urls
}

export async function startAnalysis(
  proc: TrueMediaProcessorId,
  media: MediaTrack,
  userId: string,
  priority: QueuePriority,
  apiAuthInfo: ApiAuthInfo,
) {
  if (!isTrueMediaProcessorId(proc)) return response.error(`Invalid processor: '${proc}'`)
  console.log(`Fetching ${proc} analysis [media=${media.id}, url=${media.url}]`)

  const source = proc

  // We need to make sure that this analysis_result record exists
  // before we call the scheduler to avoid a race condition where
  // the scheduler actually finishes the task _before_ we've even
  // saved the record to the database. So we call processing() here
  // with an empty requestId.
  await processing(media.id, source, userId, "", apiAuthInfo)
  const messageId = await truemediaSchedulerJobs[proc].schedule({
    priority,
    json: { mediaId: media.id },
  })
  return await processing(media.id, source, userId, messageId, apiAuthInfo)
}

export const truemediaSchedulerJobs = Object.fromEntries(
  truemediaProcessorIds.map((processor) => [processor, makeTruemediaSchedulerJob(processor)]),
) as Record<TrueMediaProcessorId, ReturnType<typeof makeTruemediaSchedulerJob>>

function makeTruemediaSchedulerJob(processor: TrueMediaProcessorId) {
  return makeSchedulerJob({
    processor,
    payloadSchema: z.object({
      mediaId: z.string(),
    }),
    handler: async ({ mediaId }, parentLogger) => {
      const logger = parentLogger.child({ mediaId })
      const progress = await fetchSingleProgress(mediaId)
      if (progress.result !== "progress" || progress.url == null) {
        return { status: "retry" }
      }
      const url = progress.url

      // Update the created time to now so that the time between
      // created and completed is the total time the job took.
      await db.analysisResult.update({
        where: { mediaId_source: { mediaId, source: processor } },
        data: { created: new Date() },
      })

      const baseUrl = urls[processor]
      const [jsonResp, latencyMs] = await withLatency(
        fetchJson(baseUrl, {
          method: "POST",
          body: JSON.stringify(mkPayload[processor](url)),
        }),
      )
      const [code, json] = jsonResp
      logger.info({ event: "analysis-finished", code, latencyMs }, `Analysis finished`)
      await handleTrueMediaModelResponse({ mediaId, code, body: JSON.stringify(json), processor })
      return { status: "complete" }
    },
  })
}

async function handleTrueMediaModelResponse({
  code,
  body,
  processor,
  mediaId,
}: {
  code: number
  body: string
  processor: TrueMediaProcessorId
  mediaId: string
}) {
  const json = JSON.parse(body)
  async function complete(requestState: RequestState, json: Record<string, any>) {
    const result = await db.analysisResult.update({
      where: { mediaId_source: { mediaId, source: processor } },
      data: {
        requestState,
        json: JSON.stringify(json),
        completed: new Date(),
      },
    })
    console.log("Saved analysis result", result)
  }

  const fail = (msg: string, json: Record<string, any>) => complete(RequestState.ERROR, { error: msg, detail: json })
  if (!json) return await fail("Model returned no result", {})
  else if ("message" in json) return await fail(JSON.stringify(json.message), json)
  else if ("msg" in json) return await fail(JSON.stringify(json.msg), json)
  else if ("error" in json) return await fail(JSON.stringify(json.error), json)
  else if (code != 200) return await fail("Analysis failed", json)
  else return await complete(RequestState.COMPLETE, json)
}

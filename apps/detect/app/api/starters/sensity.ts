import nodeFetch from "node-fetch"
import NodeFormData from "form-data"
import { RequestState } from "@prisma/client"
import { db } from "../../server"
import { MediaType } from "../../data/media"
import { response } from "../../data/model"
import { getJson, fetchJson } from "../../fetch"
import { ApiResponse, FaceApiResponse, processors } from "../../model-processors/sensity"
import { requireEnv } from "../util"
import { processing, fail } from "./util"
import { Starter } from "./types"

// Sensity API documentation: https://docs.sensity.ai/
const SENSITY_BASE_URL = "https://api.sensity.ai/tasks"

type SensityResponse = {
  success: boolean
  report_id: string
}

export const bearerToken = requireEnv("SENSITY_API_TOKEN")

const tasks = {
  video: "face_manipulation",
  image: "ai_generated_image_detection",
  audio: "voice_analysis",
  unknown: undefined,
}

const sources: Record<MediaType, keyof typeof processors> = {
  video: "sensity-video",
  image: "sensity-image",
  audio: "sensity-voice",
  unknown: "sensity-image",
}

export async function checkAnalysis(requestId: string, type: MediaType, id: string) {
  // request the current status of our analysis job from Sensity
  const taskUrl = `${SENSITY_BASE_URL}/${tasks[type]}/${requestId}`
  const [resultsCode, resultsJson] = await fetchJson(taskUrl, {
    headers: { Authorization: bearerToken },
  })
  if (resultsCode != 200) {
    console.warn(`Failure checking Sensity processing status [media=${id}, req=${requestId}, type=${type}]:`)
    console.warn(resultsJson)
    return undefined
  }

  // if the result is not yet complete, just report that we're still processing...
  const rsp = resultsJson as ApiResponse
  if (rsp.status != "completed" && rsp.status != "failed") return undefined

  // sensity includes very verbose data in their results; we don't want to overflow our database with this unneeded
  // information so we delete it before storing the result in the database
  if (type === "video") {
    const frsp = rsp as FaceApiResponse
    if (frsp.result && frsp.result.explanation) {
      for (const explain of frsp.result.explanation) {
        delete explain["fake_face"] // delete enormous base64 encoded image
        explain.tracks = [] // clear out massive list of bounding boxes
      }
    }
  }

  // otherwise update the database to store the final response, and send it back
  console.log(`Got Sensity result [id=${id}, status=${rsp.status}]`)
  const source = sources[type]
  const completed = new Date()
  await db.analysisResult.update({
    where: { mediaId_source: { mediaId: id, source } },
    data: {
      requestState: RequestState.COMPLETE,
      json: JSON.stringify(resultsJson),
      completed,
    },
  })
  return { rsp, completed }
}

export const startAnalysis: Starter = async (media, userId, priority, apiAuthInfo) => {
  if (!process.env.SENSITY_API_TOKEN) {
    return response.error("Sensity API key not configured")
  }

  // otherwise we need to start the analysis, which involves multiple steps
  console.log(`Initiating Sensity upload [id=${media.id}, file=${media.file}, url=${media.url}]`)
  const source = sources[media.type]

  // first open a stream to download the media
  try {
    const mediaRsp = await nodeFetch(media.url)
    if (!mediaRsp.ok) {
      const detail = await mediaRsp.text()
      console.warn(`Failed to download media for Sensity upload [url=${media.url}, error=${detail}]`)
      return response.error("Failed to download media", detail)
    }
    if (!mediaRsp.body) {
      console.warn(`Got empty media request body?`, mediaRsp)
      return response.error("Failed to download media", "Empty response body")
    }

    // then pipe that into a POST request to Sensity with multipart file data
    const form = new NodeFormData()
    form.append("explain", "true")
    const contentLength = parseInt(mediaRsp.headers.get("Content-Length") || "0")
    form.append("file", mediaRsp.body, {
      filename: media.file,
      contentType: media.mimeType,
      knownLength: contentLength,
    })

    const [apiCode, apiJson] = await getJson(
      await nodeFetch(`${SENSITY_BASE_URL}/${tasks[media.type]}`, {
        method: "POST",
        headers: { Authorization: bearerToken },
        body: form,
      }),
    )
    if (apiCode != 200 || !("success" in apiJson) || !apiJson.success) {
      const tooLarge = apiCode == 413
      const apiError = "error" in apiJson
      const msg = tooLarge
        ? "File exceeds 32MB maximum size."
        : apiError
          ? "Failed to analyze media."
          : "Failed to upload media."
      if (tooLarge || apiError) await fail(media.id, source, userId, msg, apiJson, apiAuthInfo)
      return response.error(msg, apiJson)
    }

    console.log(`Uploaded to Sensity [id=${media.id}, file=${media.file}, size=${contentLength}]`, apiJson)
    const { report_id } = apiJson as SensityResponse
    return await processing(media.id, source, userId, report_id, apiAuthInfo)
  } catch (error) {
    console.warn(`Failed to upload to Sensity [id=${media.id}]: ${error}`)
    if (!(error as any).code) console.warn(error)
    return response.error("Failed to upload media.", error)
  }
}

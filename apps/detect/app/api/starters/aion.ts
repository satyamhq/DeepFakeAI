import nodeFetch from "node-fetch"
import NodeFormData from "form-data"
import { RequestState } from "@prisma/client"
import { ApiResponse, processors } from "../../model-processors/aion"
import { MediaTrack } from "../../data/media"
import { response } from "../../data/model"
import { fetchJson, getJson } from "../../fetch"
import { requireEnv } from "../util"
import { complete } from "./util"
import { Starter } from "./types"

// AI or Not API documentation: https://docs.aiornot.com/
const AION_IMAGE_URL = "https://api.aiornot.com/v1/reports/image"
const AION_AUDIO_URL = "https://api.aiornot.com/v1/reports/audio"
const AION_HEADERS = {
  Accept: "application/json",
  Authorization: `Bearer ${requireEnv("AION_API_KEY")}`,
}

export const startAnalysis: Starter = async (media: MediaTrack, userId: string, priority, apiAuthInfo) => {
  if (!process.env.AION_API_KEY) return response.error("AION API key not configured")

  console.log(`Starting AION analysis [media=${media.id}, type=${media.type}, url=${media.url}]`)
  const started = new Date()

  // for audio we have to actually upload the media to them, whereas for images
  // we can just send them the URL and they download it :man-shrugging:
  let source: keyof typeof processors, code: number, json: Record<string, any>
  if (media.type === "audio") {
    source = "aion-audio"
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

    // then pipe that into a POST request to AION with multipart file data
    const form = new NodeFormData()
    const contentLength = parseInt(mediaRsp.headers.get("Content-Length") || "0")
    form.append("object", mediaRsp.body, {
      filename: media.file,
      contentType: media.mimeType,
      knownLength: contentLength,
    })

    const arsp = await getJson(
      await nodeFetch(AION_AUDIO_URL, {
        method: "POST",
        headers: AION_HEADERS,
        body: form,
      }),
    )
    code = arsp[0]
    json = arsp[1]
  } else {
    source = "aion-image"
    const irsp = await fetchJson(AION_IMAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...AION_HEADERS,
      },
      body: JSON.stringify({ object: media.url }),
    })
    code = irsp[0]
    json = irsp[1]
  }

  const fail = (msg: string, json: Record<string, any>) =>
    complete(media.id, source, userId, started, "", RequestState.ERROR, { error: msg, detail: json }, apiAuthInfo)

  if (code != 200) {
    console.warn("AION request failed", json)
    // Error responses contain a 'message' or 'msg' property
    const errmsg = JSON.stringify("message" in json ? json.message : "msg" in json ? json.msg : json)
    return await fail(errmsg, json)
  }
  if (!("report" in json)) {
    console.warn("Missing 'report' in AION analysis response:", json)
    return await fail("Analysis request failed.", json)
  }

  const rsp = json as ApiResponse
  return await complete(media.id, source, userId, started, rsp.id, RequestState.COMPLETE, json, apiAuthInfo)
}

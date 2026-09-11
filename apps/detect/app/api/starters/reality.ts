import { RequestState } from "@prisma/client"
import { MediaType } from "../../data/media"
import { response } from "../../data/model"
import { db } from "../../server"
import { processors } from "../../model-processors/reality"
import { requireEnv } from "../util"
import { fail } from "./util"
import { Starter } from "./types"

type GetUrlResponse = {
  code: string
  errno: number
  requestId: string
  response: {
    signedUrl: string
  }
}

// Reality Defender documentation: https://docs.realitydefender.com/
export const REALITY_BASE_URL = "https://api.prd.realitydefender.xyz/api"

const apiKey = requireEnv("REALITY_API_KEY")

const sources: Record<MediaType, keyof typeof processors> = {
  video: "rd-video",
  image: "rd-image",
  audio: "rd-audio",
  unknown: "rd-image",
}

export const startAnalysis: Starter = async (media, userId, priority, apiAuthInfo) => {
  // if we're talking to a local database, don't issue a reality defender query as we will never
  // receive a webhook callback on the local database; just return fake results
  if (process.env.POSTGRES_PRISMA_URL?.includes("@localhost")) {
    return response.error("Cannot perform Reality Defender analysis from test environment")
  }
  if (!process.env.REALITY_API_KEY) {
    return response.error("Reality Defender API key not configured")
  }

  console.log(`Initiating Reality upload [id=${media.id}, url=${media.url}]`)

  const source = sources[media.type]
  const dbKey = { mediaId_source: { mediaId: media.id, source } }

  // otherwise we need to start the upload, which involves multiple steps
  try {
    // first open a stream to download the media
    const mediaRsp = await fetch(media.url, { method: "GET" })
    if (!mediaRsp.ok) {
      console.warn(`Failed to fetch [url=${media.url}, status=${mediaRsp.statusText}]`)
      return response.error("Failed to download media", mediaRsp.statusText)
    }
    const contentLength = parseInt(mediaRsp.headers.get("Content-Length") || "0")
    if (contentLength == 0) {
      console.warn(`Missing content-length header [url=${media.url}]`)
      return response.error("Failed to obtain content length of media")
    }

    console.log(`Getting presigned URL [id=${media.id}, length=${contentLength}]`)
    const getUrlRsp = await fetch(`${REALITY_BASE_URL}/files/aws-presigned`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        fileName: media.file,
        fileSize: contentLength,
      }),
    })
    if (!getUrlRsp.ok) {
      const detail = await getUrlRsp.json()
      return await fail(
        media.id,
        source,
        userId,
        detail.response ?? "Failed to obtain presigned upload URL.",
        detail,
        apiAuthInfo,
      )
    }
    const getUrlJson = (await getUrlRsp.json()) as GetUrlResponse
    if (getUrlJson.code != "ok") {
      return await fail(media.id, source, userId, "Failed to obtain presigned upload URL", getUrlJson, apiAuthInfo)
    }

    // we may be starting a new analysis for this media
    await db.analysisResult.upsert({
      where: dbKey,
      create: {
        mediaId: media.id,
        source,
        userId,
        json: JSON.stringify({}),
        requestId: getUrlJson.requestId,
        requestState: RequestState.UPLOADING,
        apiKeyId: apiAuthInfo?.success ? apiAuthInfo.authInfo.apiKeyId : undefined,
      },
      update: {
        created: new Date(),
        requestId: getUrlJson.requestId,
        requestState: RequestState.UPLOADING,
      },
    })

    const signedUrl = getUrlJson.response.signedUrl
    console.log(`Uploading to RD [id=${media.id}, file=${media.file}, signedUrl=${signedUrl}]`)
    const uploadRsp = await fetch(signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mediaRsp.headers.get("Content-Type"),
        "Content-Length": contentLength,
      },
      body: mediaRsp.body,
      duplex: "half",
    } as any) // TODO: remove this cast when TypeScript supports `duplex` option
    if (!uploadRsp.ok) {
      return await fail(media.id, source, userId, "Failed to start media upload", await uploadRsp.text(), apiAuthInfo)
    }

    console.log(`Completed RD upload [id=${media.id}, reqId=${getUrlJson.requestId}]`)
    await db.analysisResult.update({
      where: dbKey,
      data: {
        requestState: RequestState.PROCESSING,
      },
    })

    return response.processing()
  } catch (error) {
    // fetch wraps the underlying error, so unwrap it
    const cause = (error as any).cause ?? error
    console.warn(`Failed to upload to RD [id=${media.id}]: ${cause}`)
    if (!cause.code) console.warn(error)
    return response.error("Failed to upload media.", cause)
  }
}

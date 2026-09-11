import path from "path"
import { promises as fs } from "fs"
import { NextRequest } from "next/server"

import { db } from "../../server"
import { JoinedMedia, mediaType, thumbnailUrl } from "../../data/media"
import { mediaVerdict } from "../../data/verdict"
import { response } from "../util"
import { addVerdictOverlay } from "./overlay"

async function buildDefaultResponse() {
  const filePath = path.resolve("./public/truemedia-open-graph.png")
  const file = await fs.readFile(filePath)
  return new Response(file, {
    status: 200,
    headers: { "Content-Type": "image/png" },
  })
}

export async function GET(req: NextRequest) {
  const mediaId = req.nextUrl.searchParams.get("mediaId")
  if (!mediaId) {
    return response.make(400, "Missing required query param: mediaId")
  }

  const media: JoinedMedia | null = await db.media.findUnique({
    where: { id: mediaId },
    include: { meta: true },
  })

  if (!media) {
    console.warn("mediaId not found in db, returning default image", mediaId)
    return response.make(404, `Media with mediaId '${mediaId}' not found`)
  }

  // if we don't have a concrete verdict, return default image
  const { experimentalVerdict: verdict } = mediaVerdict(media)
  if (verdict === "unknown") {
    console.log("No verdict available for media, returning default image", mediaId)
    return await buildDefaultResponse()
  }

  let inputBuffer: ArrayBufferLike | null = null

  const isAudio = mediaType(media.mimeType) === "audio"
  // for audio we don't have a thumbnail so use a static audio thumb
  if (isAudio) {
    console.log("Audio media type", mediaId)
    const filePath = path.resolve("./public/audio-open-graph.png")
    const file = await fs.readFile(filePath)
    inputBuffer = file.buffer
  } else {
    // fetch the video/image thumbnail (if there is one)
    try {
      const imageResponse = await fetch(thumbnailUrl(mediaId))
      if (imageResponse.ok) {
        inputBuffer = await imageResponse.arrayBuffer()
      }
    } catch (error) {
      console.error(`Error fetching thumbnail: mediaId=[${mediaId}], thumbnail_url=[${thumbnailUrl(mediaId)}].`, error)
      inputBuffer = null
    }
  }

  if (!inputBuffer) {
    console.log("No thumbnail available for mediaId, returning default image", mediaId)
    // if we have no thumbnail, just return the default image without any verdict applied
    return await buildDefaultResponse()
  }

  // compose thumbnail with verdict overlay
  const { image: outputImage, contentType } = await addVerdictOverlay(inputBuffer, media, verdict, !isAudio)

  return new Response(outputImage, {
    status: 200,
    headers: { "Content-Type": contentType },
  })
}

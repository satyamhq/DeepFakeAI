import { NextRequest } from "next/server"
import { response } from "../util"
import { getMediaMetadata, humanFactCheckersNotification, upsertMediaMetadata } from "./actions"
import { Trulean, YesNoReview } from "@prisma/client"
import { db, ensureInternalUser } from "../../server"

export const dynamic = "force-dynamic"

export type UpdateMetadataRequest = {
  fake?: Trulean
  audioFake?: Trulean
  language?: string
  handle?: string
  source?: string
  keywords?: string
  comments?: string
  videoObjectOverlay?: YesNoReview
  videoTextOverlay?: YesNoReview
  videoEffects?: YesNoReview
  noPhotorealisticFaces?: boolean
}

export async function GET(req: NextRequest) {
  const err = await ensureInternalUser(req)
  if (err) {
    return err
  }

  const mediaId = req.nextUrl.searchParams.get("id")
  if (!mediaId) {
    return response.error(400, "id parameter required")
  }
  const result = await getMediaMetadata(mediaId)
  if (!result) {
    return response.error(404, "metadata not found")
  }
  return response.make(200, result)
}

export async function PUT(req: NextRequest) {
  const err = await ensureInternalUser(req)
  if (err) {
    return err
  }

  const mediaId = req.nextUrl.searchParams.get("id")
  if (!mediaId) {
    return response.error(400, "id parameter required")
  }
  const update = (await req.json()) as UpdateMetadataRequest

  const oldMedia = await db.media.findFirst({ where: { id: mediaId }, include: { meta: true } })

  try {
    const result = await upsertMediaMetadata(mediaId, update)
    humanFactCheckersNotification(oldMedia)
    return response.make(200, result)
  } catch (e: any) {
    return response.make(400, e.message as string)
  }
}

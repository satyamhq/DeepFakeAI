"use server"

import { db } from "../../../server"
import { TAKE_DEFAULT } from "../../ui"

export async function getNotableMedia(skip = 0, take = TAKE_DEFAULT) {
  const total = await db.notableMedia.count({ take })
  const media = await db.notableMedia.findMany({
    skip,
    take,
    orderBy: { created: "desc" },
    include: { media: { include: { meta: true } } },
  })
  return { total, media }
}

export async function createNotableMedia(mediaId: string) {
  const media = await db.media.findUnique({ where: { id: mediaId } })
  const notableMedia = await db.notableMedia.findUnique({
    where: { mediaId: mediaId },
  })

  if (!media) {
    return {
      error: true,
      message: "Media id not found: " + mediaId,
    }
  }

  if (notableMedia) {
    return {
      error: true,
      message: "NotableMedia already exists for id:" + mediaId,
    }
  }

  await db.notableMedia.create({ data: { mediaId: mediaId } })
  return {
    error: false,
    message: "NotableMedia created for id:" + mediaId,
  }
}

export async function updateNotableMedia(mediaId: string, update: Record<string, any>) {
  await db.notableMedia.upsert({
    where: { mediaId },
    create: { ...update, mediaId },
    update: update,
  })
}

export async function deleteNotableMedia(mediaId: string) {
  await db.notableMedia.delete({
    where: { mediaId },
  })
}

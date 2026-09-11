"use server"

import { db } from "../../../server"
import { supabase } from "../../../supabase"
import { TAKE_DEFAULT } from "../../ui"

export async function getNotableMedia(skip = 0, take = TAKE_DEFAULT) {
  try {
    // Try Supabase notable_media table first
    const { data: supaData, count: supaCount, error: supaErr } = await supabase
      .from("notable_media")
      .select("*, media(*)", { count: "exact" })
      .range(skip, skip + take - 1)
      .order("created", { ascending: false })

    if (!supaErr && supaData && supaData.length > 0) {
      return { total: supaCount || supaData.length, media: supaData }
    }

    // Fallback to Prisma if configured
    const total = await db.notableMedia.count({ take })
    const media = await db.notableMedia.findMany({
      skip,
      take,
      orderBy: { created: "desc" },
      include: { media: { include: { meta: true } } },
    })
    return { total, media }
  } catch (error) {
    console.warn("Could not fetch notable media (Supabase/DB empty or offline):", error)
    return { total: 0, media: [] }
  }
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

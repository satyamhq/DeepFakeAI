"use server"

import { Trulean } from "@prisma/client"
import { db, getServerRole } from "../../server"
import { humanFactCheckersNotification } from "../../api/media-metadata/actions"
import { revalidatePath } from "next/cache"

type ErrorCase = { type: "error"; message: string }
export type UpdateResponse = ErrorCase | { type: "updated"; id: string }

export async function updateMetadata(mediaId: string, update: Record<string, any>): Promise<UpdateResponse> {
  const role = await getServerRole()
  if (!role.canEditMetadata) return { type: "error", message: "Not allowed." }

  console.log(`Updating metadata [user=${role.email}, media=${mediaId}, update=${JSON.stringify(update)}]`)

  const oldMedia = await db.media.findFirst({ where: { id: mediaId }, include: { meta: true } })
  await db.mediaMetadata.upsert({
    where: { mediaId },
    create: { ...update, mediaId },
    update: update,
  })

  humanFactCheckersNotification(oldMedia)

  return { type: "updated", id: mediaId }
}

export type FeedbackResponse = ErrorCase | { type: "saved" }

export async function saveFeedback(mediaId: string, fake: Trulean, comments: string): Promise<FeedbackResponse> {
  const role = await getServerRole()
  if (!role.user) return { type: "error", message: "Not allowed." }

  console.log(`Noting user feedback [user=${role.email}, media=${mediaId}, fake=${fake}"]`)
  const userId = role.id
  await db.userFeedback.upsert({
    where: { userId_mediaId: { userId, mediaId } },
    create: { userId, mediaId, fake, comments },
    update: { fake, comments },
  })
  return { type: "saved" }
}

export async function softDeleteQuery(postUrl: string) {
  const role = await getServerRole()
  const result = await db.query.updateMany({
    where: { postUrl, userId: role.id, isDeleted: false },
    data: { isDeleted: true },
  })

  // mark history page as needing revalidation
  revalidatePath("/media/history", "page")
  revalidatePath("/", "page")

  return result.count
}

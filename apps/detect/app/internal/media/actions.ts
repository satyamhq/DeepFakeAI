"use server"

import { db, getServerRole } from "../../server"

type ErrorCase = {
  type: "error"
  message: string
}

export type DeleteResponse = ErrorCase | { type: "deleted"; mediaId: string }

export async function deleteMedia(mediaId: string): Promise<DeleteResponse> {
  const role = await getServerRole()
  if (!role.isLoggedIn) return { type: "error", message: "Must be logged in." }

  const media = await db.media.findUnique({ where: { id: mediaId } })
  if (!media) return { type: "error", message: "Media not found." }

  const isOwner = (media as any).userId === role.id
  if (!role.admin && !isOwner) {
    return { type: "error", message: "Not authorized to delete this media." }
  }

  console.log(`Deleting media [user=${role.email}, roleAdmin=${role.admin}, isOwner=${isOwner}, id=${mediaId}]`)
  const resDels = await db.analysisResult.deleteMany({ where: { mediaId } })
  const postMediaDels = await db.postMedia.deleteMany({ where: { mediaId } })
  try {
    await db.mediaMetadata.deleteMany({ where: { mediaId } })
  } catch {
    // metadata cleanup if present
  }
  await db.media.delete({ where: { id: mediaId } })
  console.log(`Deleted media [id=${mediaId}, postMedia=${postMediaDels.count} results=${resDels.count}]`)

  return { type: "deleted", mediaId }
}

export async function markAsPostedToX(mediaId: string) {
  await db.media.update({
    where: { id: mediaId },
    data: { postedToX: true },
  })
}

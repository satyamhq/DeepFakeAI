"use server"

import { db, getServerRole } from "../../server"

type ErrorCase = {
  type: "error"
  message: string
}

export type DeleteResponse = ErrorCase | { type: "deleted"; mediaId: string }

export async function deleteMedia(mediaId: string): Promise<DeleteResponse> {
  const role = await getServerRole()
  if (!role.admin) return { type: "error", message: "Not allowed." }

  console.log(`Deleting media [admin=${role.email}, id=${mediaId}]`)
  const resDels = await db.analysisResult.deleteMany({ where: { mediaId } })
  const postMediaDels = await db.postMedia.deleteMany({ where: { mediaId } })
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

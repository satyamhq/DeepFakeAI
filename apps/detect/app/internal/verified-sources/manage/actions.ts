"use server"

import { MediaPublisher, VerifiedSource } from "@prisma/client"
import { db, getServerRole } from "../../../server"
import { revalidatePath } from "next/cache"
import { updateVerifiedMediaAfterDelete, updateVerifiedMediaAfterInsert } from "../../../api/verified-source/actions"

export async function createVerifiedSource(platform: string, displayName: string, platformId: string) {
  const role = await getServerRole()
  if (!role.canEditMetadata) return { error: "Unauthorized." }

  const params = {
    platform: platform as MediaPublisher,
    platformId: platformId,
    displayName,
  }
  let saved, updated
  try {
    saved = await db.verifiedSource.create({ data: params })
    updated = await updateVerifiedMediaAfterInsert([saved])
    revalidatePath("/internal/verified-sources", "page")
  } catch (e: any) {
    return { error: e.message as string }
  }
  return { saved, count: updated.length }
}

export async function updateVerifiedSource(source: VerifiedSource) {
  const role = await getServerRole()
  if (!role.canEditMetadata) return { error: "Unauthorized." }

  let updatedSource, updatedMedia
  try {
    updatedSource = await db.verifiedSource.update({
      where: { id: source.id },
      data: { ...source },
    })
    updatedMedia = await updateVerifiedMediaAfterInsert([updatedSource])
  } catch (e: any) {
    console.warn("Error updating verified source:", e.message)
    return { error: e.message as string }
  }
  return { updated: updatedSource, count: updatedMedia.length }
}

export async function deleteVerifiedSource(id: string) {
  const role = await getServerRole()
  if (!role.canEditMetadata) return { error: "Unauthorized." }

  const params = { where: { id } }
  let deleted, updated
  try {
    deleted = await db.verifiedSource.delete(params)
    updated = await updateVerifiedMediaAfterDelete(deleted)
  } catch (e: any) {
    console.warn("Error deleting verified source:", e.message)
    return { error: e.message as string }
  }
  return { deleted, count: updated.count }
}

"use server"
import { Media } from "@prisma/client"
import * as mediares from "../services/mediares"

export async function fetchMediaProgress(media: Pick<Media, "id" | "audioId" | "size">) {
  return mediares.fetchMediaProgress(media)
}

export async function fetchProgress(ids: string[]) {
  return mediares.getMediaResClient().fetchProgress(ids)
}

export async function createFileUpload(filename: string) {
  return mediares.getMediaResClient().createFileUpload(filename)
}

export async function fetchSingleProgress(id: string) {
  return mediares.fetchSingleProgress(id)
}

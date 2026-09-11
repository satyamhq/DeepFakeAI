"use server"
import { Media } from "../types/db"
import * as mediares from "../services/mediares"

export async function fetchMediaProgress(media: Pick<Media, "id" | "audioId" | "size"> & { mediaUrl?: string }) {
  try {
    return await mediares.fetchMediaProgress(media)
  } catch (err: any) {
    return { result: "failure" as const, reason: err?.message || "Service unavailable" }
  }
}

export async function fetchProgress(ids: string[]) {
  try {
    return await mediares.getMediaResClient().fetchProgress(ids)
  } catch (err: any) {
    return { result: "failure" as const, reason: err?.message || "Service unavailable" }
  }
}

export async function createFileUpload(filename: string) {
  try {
    return await mediares.getMediaResClient().createFileUpload(filename)
  } catch (err: any) {
    return {
      result: "failure" as const,
      reason: err?.message || "Legacy media resolver is unavailable. Use direct upload instead.",
    }
  }
}

export async function fetchSingleProgress(id: string) {
  try {
    return await mediares.fetchSingleProgress(id)
  } catch (err: any) {
    return { result: "failure" as const, reason: err?.message || "Service unavailable" }
  }
}

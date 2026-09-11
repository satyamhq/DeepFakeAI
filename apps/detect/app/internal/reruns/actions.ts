"use server"

import { db, getServerRole } from "../../server"
import { processors } from "../../model-processors/all"
import { loadMedia } from "../../api/process-reruns/actions"
import { DateRange } from "../summarize"

type ErrorCase = { type: "error"; message: string }
const mkError = (message: string): ErrorCase => ({ type: "error", message })

export type CreateResponse = ErrorCase | { type: "created"; id: string; matched: number; incomplete: number }

export async function createRerun({
  source,
  keywords,
  mediaId,
  dateRange,
  includeUnknown,
  onlyErrors,
  leewayDays,
}: {
  source: string
  keywords: string
  mediaId: string
  dateRange: DateRange
  includeUnknown: boolean
  onlyErrors: boolean
  leewayDays: number
}): Promise<CreateResponse> {
  const role = await getServerRole()
  if (!role.internal) return mkError("Not allowed.")

  const proc = processors[source]
  if (!proc) return mkError(`Unknown source: ${source}`)

  // Always include unknown if we've specified rerunning exactly 1 run per media ID
  includeUnknown = mediaId ? true : includeUnknown

  const { matchedIds, incomplete } = await loadMedia({
    proc,
    keywords,
    mediaId,
    dateRange,
    started: new Date(),
    includeUnknown,
    onlyErrors,
    leewayDays,
  })
  if (matchedIds.length == 0) return mkError(`No media matched that source and keyword filter.`)

  const rerun = await db.rerun.create({
    data: {
      creatorId: role.id,
      source,
      keywords,
      mediaId,
      leewayDays,
      fromDate: dateRange.from,
      toDate: dateRange.to,
      includeUnknown,
      onlyErrors,
      matched: matchedIds.length,
      started: new Date(),
      complete: 0,
    },
  })
  return { type: "created", id: rerun.id, matched: matchedIds.length, incomplete: incomplete.length }
}

export type DeleteResponse = ErrorCase | { type: "deleted"; id: string }

export async function deleteRerun(id: string): Promise<DeleteResponse> {
  const role = await getServerRole()
  if (!role.internal) return mkError("Not allowed.")

  const rerun = await db.rerun.delete({ where: { id } })
  if (!rerun) return mkError(`No rerun with id: ${id}`)

  return { type: "deleted", id }
}

"use server"

import { mediaVerdict, Verdict } from "../../data/verdict"
import { db } from "../../server"
import { Media } from "../../types/db"

export async function getMediaVerdicts(ids: string[]): Promise<Record<string, Verdict>> {
  const medias = await db.media.findMany({ where: { id: { in: ids } }, include: { meta: true } })
  const verdicts: Record<string, Verdict> = {}
  medias.forEach((media: Media) => {
    verdicts[media.id] = mediaVerdict(media as any).verdict
  })
  return verdicts
}

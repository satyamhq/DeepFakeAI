"use server"

import { mediaVerdict, Verdict } from "../../data/verdict"
import { db } from "../../server"

export async function getMediaVerdicts(ids: string[]): Promise<Record<string, Verdict>> {
  const medias = await db.media.findMany({ where: { id: { in: ids } }, include: { meta: true } })
  const verdicts: Record<string, Verdict> = {}
  medias.forEach((media) => {
    verdicts[media.id] = mediaVerdict(media).verdict
  })
  return verdicts
}

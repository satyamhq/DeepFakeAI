import { NextRequest } from "next/server"
import { db } from "../../db"
import { ensureInternalUser } from "../../server"
import { response } from "../util"
import { removeKeyword } from "../resolve-media/resolve"
import { KeywordRequest } from "../add-keyword/route"

export type RemoveKeywordRequest = KeywordRequest & {
  ids: string[]
}

async function removeKeywordFromMedia(mediaId: string, keyword: string) {
  try {
    const oldMedia = await db.media.findFirst({ where: { id: mediaId }, include: { meta: true } })
    if (!oldMedia) {
      throw new Error(`not found mediaId=${mediaId}`)
    }
    const keywords = oldMedia.meta?.keywords
    return await removeKeyword({ mediaId, keywords, keyword })
  } catch (e) {
    throw new Error(`Error: ${e}. mediaId=${mediaId}`)
  }
}

export async function POST(req: NextRequest) {
  const err = await ensureInternalUser(req)
  if (err) {
    return err
  }

  const json = await req.json()
  const { keyword, ids } = json as RemoveKeywordRequest
  if (!keyword) {
    return response.error(400, "keyword required")
  }
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
    return response.error(400, "ids must be an array of strings")
  }

  const totals: Record<string, number> = { true: 0, false: 0, errors: 0 }
  await Promise.all(
    ids.map(async (id) => {
      try {
        const { updated } = await removeKeywordFromMedia(id, keyword)
        totals["" + updated]++
      } catch (e) {
        console.error(e)
        totals.errors++
      }
    }),
  )

  return response.make(200, totals)
}

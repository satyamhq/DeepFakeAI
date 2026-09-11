import { NextRequest } from "next/server"
import { db } from "../../db"
import { ensureInternalUser } from "../../server"
import { response } from "../util"
import { addKeyword } from "../resolve-media/resolve"

export type KeywordRequest = {
  keyword: string
}

async function addKeywordToMedia({ mediaId, keyword }: { mediaId: string; keyword: string }) {
  try {
    const oldMedia = await db.media.findFirst({ where: { id: mediaId }, include: { meta: true } })
    if (!oldMedia) {
      throw new Error(`not found mediaId=${mediaId}`)
    }
    const keywords = oldMedia.meta?.keywords
    return await addKeyword({ mediaId, keywords, newKeyword: keyword })
  } catch (e) {
    throw new Error(`Error: ${e}. mediaId=${mediaId}`)
  }
}

export async function PUT(req: NextRequest) {
  const err = await ensureInternalUser(req)
  if (err) {
    return err
  }

  const mediaId = req.nextUrl.searchParams.get("id")
  if (!mediaId) {
    return response.error(400, "id parameter required")
  }
  const { keyword } = (await req.json()) as KeywordRequest
  if (!keyword) {
    return response.error(400, "keyword parameter required")
  }

  const updated = await addKeywordToMedia({ mediaId, keyword })
  return response.make(200, updated)
}

export async function POST(req: NextRequest) {
  const err = await ensureInternalUser(req)
  if (err) {
    return err
  }

  const json = await req.json()
  const { keyword, ids } = json
  if (!keyword) {
    return response.error(400, "keyword required")
  }
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
    return response.error(400, "ids must be an array of strings")
  }

  const totals: Record<string, number> = { true: 0, false: 0, errors: 0 }
  const failingMediaIDs: string[] = []
  await Promise.all(
    ids.map(async (mediaId) => {
      try {
        const { updated } = await addKeywordToMedia({ mediaId, keyword })
        totals["" + updated]++
      } catch (e) {
        console.error(e)
        totals.errors++
        failingMediaIDs.push(mediaId)
      }
    }),
  )

  return response.make(200, { totals, failingMediaIDs })
}

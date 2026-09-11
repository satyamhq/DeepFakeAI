import { NextRequest } from "next/server"
import { Media, AnalysisResult } from "@prisma/client"
import { db } from "../../server"
import { response } from "../util"
import { checkResults, updateResults, maybeUpdateResults } from "../get-results/actions"
import { ApiAuthInfo } from "../apiKey"

export const dynamic = "force-dynamic"

// Extend the max runtime for this script because it does a lot of database grinding.
export const maxDuration = 300

type MediaAndResults = Media & { analysisResults: AnalysisResult[] }

class Recomputer {
  force = false

  rsp = {
    processed: 0,
    changed: 0,
    missing: 0,
  }

  constructor(private apiAuthInfo: ApiAuthInfo) {}

  async recompute(medias: MediaAndResults[]) {
    const { force, rsp } = this
    for (const media of medias) {
      const info = await checkResults(media, media.analysisResults, {
        includeIgnoredModels: true,
        apiAuthInfo: this.apiAuthInfo,
      })
      rsp.processed += 1
      if (force) {
        await updateResults(media, info)
        rsp.changed += 1
      } else if (await maybeUpdateResults(media, info)) rsp.changed += 1
    }
  }

  async process(ids: string[]) {
    let first = 0
    while (first < ids.length) {
      const media = await db.media.findMany({
        where: { id: { in: ids.slice(first, first + 500) } },
        include: { analysisResults: true },
      })
      await this.recompute(media)
      first += 500
    }
  }
}

export async function GET(req: NextRequest) {
  const apiAuthInfo: ApiAuthInfo = {
    success: false,
    publicReason: "Not authenticated",
    privateReason: "the /api/recompute-scores endpoint does no authentication",
  }

  const recomputer = new Recomputer(apiAuthInfo)
  recomputer.force = req.nextUrl.searchParams.get("force") == "true"

  const ids = req.nextUrl.searchParams.getAll("id")
  if (ids && ids.length > 0) {
    await recomputer.process(ids)
  } else {
    const start = parseInt(req.nextUrl.searchParams.get("start") || "0")
    const take = 500

    const type = req.nextUrl.searchParams.get("type")
    const where = type ? { mimeType: { startsWith: type } } : undefined

    // load up all the media (and raw analysis results) in the database in batches of 500
    for (let skip = start; ; skip += take) {
      const media = await db.media.findMany({ where, skip, take, include: { analysisResults: true } })
      if (media.length == 0) break
      await recomputer.recompute(media)
    }
  }

  return response.make(200, recomputer.rsp)
}

// Pass a list of ids to this endpoint using curl like so:
// curl --data-binary "@ids.txt" https://PLACEHOLDER/api/recompute-scores
export async function POST(req: NextRequest) {
  const apiAuthInfo: ApiAuthInfo = {
    success: false,
    publicReason: "Not authenticated",
    privateReason: "the /api/recompute-scores endpoint does no authentication",
  }

  const ids = (await req.text()).split("\n")
  if (ids.length == 0) {
    return response.error(400, "Post body must be a list of media ids")
  }

  const recomputer = new Recomputer(apiAuthInfo)
  recomputer.force = req.nextUrl.searchParams.get("force") == "true"
  await recomputer.process(ids)
  return response.make(200, recomputer.rsp)
}

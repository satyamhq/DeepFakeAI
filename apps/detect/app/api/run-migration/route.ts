import { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { db, getRoleByUserId } from "../../server"
import { FaceApiResponse } from "../../model-processors/sensity"
import { HiveApiResponse } from "../../model-processors/hive"
import { checkApiAuthorization } from "../apiKey"
import { response } from "../util"
import { extractMediaSourceData } from "../source"
import { pruneToHighestScoringOutput } from "../../model-processors/hive-util"

// Running migrations sometimes takes a while.
export const maxDuration = 300

async function ensureInternalUser(req: NextRequest): Promise<Response | null> {
  const authInfoResult = await checkApiAuthorization(req.headers)
  if (!authInfoResult.success) return response.error(401, authInfoResult.publicReason)
  const role = await getRoleByUserId(authInfoResult.authInfo.userId)
  return role.internal ? null : response.error(403, "User not authorized to call this endpoint")
}

async function backfillMediaSource() {
  type MediaIdAndJson = {
    id: string
    post_url: string
    json: string
  }

  const rowsToUpdate = await db.$queryRaw<MediaIdAndJson[]>(
    Prisma.sql`select m.id, pmd.post_url, pmd.json
        from media m
        left join post_media pm on m.id = pm.media_id
        left join post_metadata pmd on pm.post_url = pmd.post_url
        where source = 'UNKNOWN'
        and pmd.post_url not ilike '%drive.google%'
        and pmd.json is not null
        order by resolved_at desc
        limit 300`,
  )

  const found = rowsToUpdate.length
  let updated = 0
  for (const row of rowsToUpdate) {
    const sourceData = extractMediaSourceData(row.post_url, JSON.parse(row.json))
    if (sourceData) {
      await db.media.update({
        where: {
          id: row.id,
        },
        data: {
          source: sourceData.source,
          sourceUserId: sourceData.sourceUserId,
          sourceUserName: sourceData.sourceUserName,
        },
      })
      updated++
    } else {
      console.error(`no source data id=${row.id} post_url=${row.post_url}, json=${row.json}`)
    }
  }

  return response.make(200, { found, updated })
}

async function pruneSensityResults() {
  const take = 500
  let updated = 0
  let skip = 0

  let read: number | undefined = undefined
  while (read !== 0) {
    const results = await db.analysisResult.findMany({ where: { source: "sensity-video" }, skip, take })
    read = results.length
    console.log(`Pruning Sensity results [offset=${skip}, current=${read}]`)
    for (const result of results) {
      try {
        const frsp = JSON.parse(result.json) as FaceApiResponse
        if (frsp.result && frsp.result.explanation) {
          for (const explain of frsp.result.explanation) {
            delete explain["fake_face"] // delete enormous base64 encoded image
            explain.tracks = [] // clear out massive list of bounding boxes
          }
          const newJson = JSON.stringify(frsp)
          if (result.json != newJson) {
            await db.analysisResult.update({
              where: {
                mediaId_source: { mediaId: result.mediaId, source: result.source },
              },
              data: {
                json: newJson,
              },
            })
            updated += 1
          }
        }
      } catch (error) {
        console.log(`Failed to parse analysis_result`, error)
      }
    }
    skip += take
  }

  return response.make(200, { updated })
}

async function pruneHiveResults() {
  const take = 500
  let updated = 0
  let skip = 0

  let read: number | undefined = undefined
  while (read !== 0) {
    const results = await db.analysisResult.findMany({ where: { source: "hive-video-multi" }, skip, take })
    read = results.length
    console.log(`Pruning Hive results [offset=${skip}, current=${read}]`)
    for (const result of results) {
      try {
        const frsp = JSON.parse(result.json) as HiveApiResponse
        const newJson = JSON.stringify(pruneToHighestScoringOutput(frsp))
        if (result.json != newJson) {
          await db.analysisResult.update({
            where: {
              mediaId_source: { mediaId: result.mediaId, source: result.source },
            },
            data: {
              json: newJson,
            },
          })
          updated += 1
        }
      } catch (error) {
        console.log(`Failed to parse analysis_result`, error)
      }
    }
    skip += take
  }

  return response.make(200, { updated })
}

export async function GET(req: NextRequest) {
  const err = await ensureInternalUser(req)
  if (err) return err

  const id = req.nextUrl.searchParams.get("id")
  switch (id) {
    case "backfill-media-source":
      return await backfillMediaSource()
    case "prune-sensity-results":
      return await pruneSensityResults()
    case "prune-hive-results":
      return await pruneHiveResults()
    default:
      return response.error(501, `Unknown migration: ${id}`)
  }
}

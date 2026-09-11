import { createObjectCsvStringifier } from "csv-writer"
import { mediaType, typeLabels } from "../../../data/media"
import { db, getServerRole } from "../../../server"
import { PostMediaWithMeta } from "../../../media/history/actions"
import { currentSiteBaseUrl } from "../../../site"
import { ManipulationCategory } from "../../../data/model"
import { NextRequest } from "next/server"
import { MediaJoinResult, searchMedia, urlSearchParamsToSearchParams } from "../search"
import { mediaVerdict } from "../../../data/verdict"
import { MediaSummary, summarize } from "../../summarize"
import { determineFake, fakeLabels } from "../../../data/groundTruth"
import { Trulean } from "@prisma/client"
import { sortScoresColumnHeaders } from "./util"

export const dynamic = "force-dynamic"

// Testing this locally the limit is a little over 1 Million.  Eventually this
// crashes with "RangeError: Invalid string length" inside csvWriter.stringifyRecords
const MAX_RESULTS = 1_000_000

type CSVRecord = {
  id: string
  audioId: string
  resolved: string
  handle: string
  keywords: string
  groundTruth: string
  weSaid: string
  relevant: string
  analysisUrl: string
  postUrl: string
  mediaTypeLabel: string
  noPhotorealisticFaces: string
}

type Header = {
  id: keyof CSVRecord | ManipulationCategory
  title: string
}

// map from the object keys to what header titles should appear in the csv
// this also defines the order of the columns in the output
const HEADERS: Header[] = [
  { id: "id", title: "Id" },
  { id: "audioId", title: "Audio ID" },
  { id: "resolved", title: "Resolved" },
  { id: "handle", title: "Handle" },
  { id: "keywords", title: "Keywords" },
  { id: "groundTruth", title: "Ground Truth" },
  { id: "weSaid", title: "We Said" },
  { id: "relevant", title: "Relevant" },
  { id: "analysisUrl", title: "Analysis" },
  { id: "postUrl", title: "Media" },
  { id: "mediaTypeLabel", title: "MediaType" },
  { id: "noPhotorealisticFaces", title: "No Photorealistic Faces" },
]

function getCsv(medias: MediaJoinResult[], mediaIdToPostMedia: Record<string, PostMediaWithMeta>): string {
  const msums = summarize(medias)
  const mediaIdToMediaSummary: Record<string, MediaSummary> = {}
  for (const msum of msums) {
    mediaIdToMediaSummary[msum.id] = msum
  }

  const sortedScoresColumnHeaders = sortScoresColumnHeaders(msums).map((header) => ({ id: header, title: header }))

  const records: CSVRecord[] = medias.map((media) => {
    const summary = mediaIdToMediaSummary[media.id]
    const postMedia = mediaIdToPostMedia[media.id]

    const id = media.id
    const audioId = media.audioId ?? ""
    const resolved = media.resolvedAt?.toISOString() ?? ""
    const keywords = media.meta?.keywords ?? ""
    let groundTruth: Trulean = Trulean.UNKNOWN
    let weSaid = "unknown"
    const relevant = ""
    const analysisUrl = currentSiteBaseUrl + "/media/analysis?id=" + media.id
    let postUrl = ""
    const type = mediaType(media.mimeType ?? "unknown")
    const mediaTypeLabel = typeLabels[type]

    if (postMedia) {
      weSaid = mediaVerdict(postMedia.media).experimentalVerdict
      groundTruth = determineFake(postMedia.media)
      postUrl = postMedia?.postUrl ?? ""
    }

    let handle = ""
    let scores = {}
    let noPhotorealisticFaces = false
    if (summary) {
      handle = summary.handle
      scores = mediaIdToMediaSummary[media.id].scores
      noPhotorealisticFaces = summary.noPhotorealisticFaces
    }

    return {
      id,
      audioId,
      resolved,
      handle,
      keywords,
      groundTruth: fakeLabels[groundTruth],
      weSaid,
      relevant,
      analysisUrl,
      postUrl,
      mediaTypeLabel,
      noPhotorealisticFaces: "" + noPhotorealisticFaces,
      ...scores,
    }
  })

  const csvWriter = createObjectCsvStringifier({
    header: [...HEADERS, ...sortedScoresColumnHeaders],
  })
  const csvString = csvWriter.getHeaderString() + csvWriter.stringifyRecords(records)
  return csvString
}

export async function GET(req: NextRequest): Promise<Response> {
  const role = await getServerRole()
  if (!role.user) return new Response("Must be logged in.", { status: 403 })

  const searchParams = urlSearchParamsToSearchParams(req.nextUrl.searchParams)

  if (searchParams.type === "any") {
    return new Response(
      `Error. Must select just one media type for export ("image", "audio", or "video"). You selected: [type="${searchParams.type}"].`,
      {
        status: 400,
      },
    )
  }

  searchParams.take = MAX_RESULTS
  const { media } = await searchMedia(searchParams)
  const postMedia = await db.postMedia.findMany({
    where: { mediaId: { in: media.map((mm) => mm.id) } },
    include: { media: { include: { meta: true } } },
  })
  const mediaIdToPostMedia: Record<string, PostMediaWithMeta> = {}
  for (const pm of postMedia) {
    mediaIdToPostMedia[pm.mediaId] = pm
  }

  const csvString = await getCsv(media, mediaIdToPostMedia)
  const fileName = `truemedia-${searchParams.type}-${new Date().toISOString()}.csv`

  return new Response(csvString, {
    status: 200,
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${fileName}"` },
  })
}

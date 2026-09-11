import { AnalysisResult, Media, RequestState } from "@prisma/client"
import { db } from "../../server"
import { Processor } from "../../data/model"
import { Filter } from "../../internal/filter"
import { DateRange } from "../../internal/summarize"

export type IncompleteAnalysisResult = {
  mediaId: string
  audioId: string | null
  mimeType: string
  audioMimeType: string | null
  source: string
  requestState: RequestState | null
}

const deltaDays = (a: Date, b: Date) => (a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000)

async function getMedia(mediaId: string, proc: Processor<any>, dateRange: DateRange, includeUnknown: boolean) {
  const include = { meta: true, analysisResults: { where: { source: proc.id } } }
  if (mediaId) {
    const media = await db.media.findFirst({ where: { id: mediaId }, include })
    if (!media) return []
    return [media]
  }

  // if the processor is type audio, we have to load both video and audio media
  const mimeFilter =
    proc.mediaType === "audio"
      ? {
          OR: [
            { mimeType: { startsWith: "audio" } },
            {
              AND: [{ mimeType: { startsWith: "video" } }, { audioId: { not: null } }],
            },
          ],
        }
      : { mimeType: { startsWith: proc.mediaType } }

  const dateRangeFilter =
    dateRange.from || dateRange.to
      ? {
          resolvedAt: {
            gte: dateRange.from ? new Date(dateRange.from) : undefined,
            lte: dateRange.to ? new Date(dateRange.to) : undefined,
          },
        }
      : {}

  // Equivalent to meansHumanVerified
  const humanVerifiedFilter = (field: string) => ({
    meta: {
      [field]: { in: ["TRUE", "FALSE"] },
    },
  })

  // if we only want media with known ground truth, we have to look at the appropriate ground truth metadata
  // (accounting for audio models looking at the audio track of videos)
  const hasGroundTruthFilter = includeUnknown
    ? {}
    : proc.mediaType === "audio"
      ? {
          AND: [{ mimeType: { startsWith: "video" } }, { audioId: { not: null } }, humanVerifiedFilter("audioFake")],
        }
      : humanVerifiedFilter("fake")

  return await db.media.findMany({
    where: { ...mimeFilter, ...dateRangeFilter, meta: { isNot: null }, ...hasGroundTruthFilter },
    include,
  })
}

export async function loadMedia({
  proc,
  keywords,
  mediaId,
  dateRange,
  started,
  includeUnknown,
  onlyErrors,
  leewayDays,
}: {
  proc: Processor<any>
  keywords: string
  mediaId: string
  dateRange: DateRange
  started: Date
  includeUnknown: boolean
  onlyErrors: boolean
  leewayDays: number
}): Promise<{ matchedIds: string[]; incomplete: IncompleteAnalysisResult[] }> {
  const media = await getMedia(mediaId, proc, dateRange, includeUnknown)

  const keywordFilter = Filter.make(keywords)

  const filterOnlyErrors = (media: Media & { analysisResults: AnalysisResult[] }) => {
    const oresult = media.analysisResults.find((rr) => rr.source == proc.id)
    if (!oresult) return false
    const data = JSON.parse(oresult.json)
    const error = proc.check && proc.check(data)
    return !!error
  }

  const matched = media.filter(
    (mm) =>
      // If the mediaId is provided specifically we don't need to perform keyword matches
      (mediaId || keywordFilter.matchesMedia(mm)) && (!onlyErrors || filterOnlyErrors(mm)),
  )

  // filter out just the media that remain to be re-analyzed
  const incomplete = matched
    .map((mm) => {
      const oresult = mm.analysisResults.find((rr) => rr.source == proc.id)
      const isIncomplete = !oresult || !oresult.completed || deltaDays(started, oresult.completed) > leewayDays
      if (!isIncomplete) return null

      return {
        mediaId: mm.id,
        audioId: mm.audioId,
        mimeType: mm.mimeType,
        audioMimeType: mm.audioMimeType,
        source: oresult?.source,
        requestState: oresult?.requestState,
      } as IncompleteAnalysisResult
    })
    .filter((inc) => !!inc)

  return { matchedIds: matched.map((mm) => mm.id), incomplete }
}

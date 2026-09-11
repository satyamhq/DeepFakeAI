import { Media, MediaMetadata, Trulean, YesNoReview } from "@prisma/client"
import { MediaSource, MediaType, mediaType, determineSource } from "../data/media"
import { determineFake } from "../data/groundTruth"
import { ModelResult, CachedResults, toRank, mkResult } from "../data/model"
import { Verdict, ExperimentalReason, resolveResults, countVotes, computeVoteVerdict } from "../data/verdict"
import { determineRelevance } from "../data/relevance"
import { manipulationModelInfo, models } from "../model-processors/all"
import { Filter } from "./filter"

export type YMD = string // YYYY-MM-DD
export type DateRange = {
  from?: YMD
  to?: YMD
}
export const toYMD = (date: Date) => date.toISOString().slice(0, 10)

export const rangeMatches = (range: DateRange, date: YMD): boolean =>
  !(range.from && range.from > date) && !(range.to && range.to < date)

export type MediaSummary = {
  id: string
  audioId: string | null
  type: MediaType
  source: MediaSource
  mediaUrl: string
  resolvedDate: YMD
  resolvedWeek: string // year + week as YYYYWW
  handle: string
  keywords: string
  speakers: string
  filterTerms: string[]
  external: boolean
  experimental: ExperimentalReason[]
  fake: Trulean
  mainFake: Trulean
  audioFake: Trulean
  relabelFake: Trulean
  relabelAudioFake: Trulean
  fakeVotes: number
  voteVerdict: Verdict // the verdict just from model votes: low (real), uncertain or high (fake)
  scores: Record<string, number> // >= 0 is a score, -1 == not applicable
  videoObjectOverlay?: YesNoReview
  videoTextOverlay?: YesNoReview
  videoEffects?: YesNoReview
  noPhotorealisticFaces: boolean
  publicComments: string
}

/* For a given date, return `[year, the ISO week number]`. From Stack Overflow.
 * We follow ISO_8601 week numbers. Read more:
 *
 * https://weeknumber.com/how-to/iso-week-numbers
 * https://weeknumber.com/how-to/javascript
 * https://en.wikipedia.org/wiki/ISO_8601
 *
 * Algorithm is to find nearest Thursday, its year is the year of the week number. Then get weeks between that date and
 * the first day of that year. Note that dates in one year can be weeks of previous or next year, overlap is up to 3
 * days.
 *
 * e.g. 2014/12/29 is Monday in week  1 of 2015
 *      2012/1/1   is Sunday in week 52 of 2011
 */
function getYearWeek(date: Date): [number, number] {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  // set to nearest Thursday: current date + 4 - current day number; make Sunday's day number 7
  d.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  // get first day of year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  // calculate full weeks to nearest Thursday
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return [d.getUTCFullYear(), weekNo]
}

/** Returns the year and ISO week number for `date` as a `YYYYWW` string. */
export function formatYearWeek(date: Date): string {
  const [year, week] = getYearWeek(date)
  return week < 10 ? `${year}0${week}` : `${year}${week}`
}

/** Computes a list of the ids of all the models among all the results in `msums`. */
export function makeModelHeaders(msums: MediaSummary[]): string[] {
  const allModels: Set<string> = new Set()
  for (const ms of msums) for (const r in ms.scores) allModels.add(r)
  return Array.from(allModels).sort()
}

/** Turns `(modelId -> [rank, score])` (by way of `ModelResult`) into `(modelId -> score)`. */
function summarizeScores(mrs: ModelResult[]): Record<string, number> {
  const scores: Record<string, number> = {}
  for (const mr of mrs) {
    // if the model claimed unknown or n/a, represent that as -1 in our summary
    scores[mr.modelId] = mr.rank == "unknown" || mr.rank == "n/a" ? -1 : mr.score
  }
  return scores
}

/** Expands `(modelId -> score)` back into `(modelId -> CachedResult)`. Gloms `unknown` into `n/a`, but that's OK. */
function unsummarizeScores(scores: Record<string, number>): CachedResults {
  const results: CachedResults = {}
  for (const [modelId, score] of Object.entries(scores)) {
    // if the model claimed unknown or n/a, that will be represented as -1 in our summary; we turn it back to n/a
    // because all we care about for eval analysis is whether the model had anything valid to say
    if (score < 0) results[modelId] = mkResult(modelId, "n/a", 0)
    else results[modelId] = mkResult(modelId, toRank(manipulationModelInfo(modelId), score), score)
  }
  return results
}

type MediaAndMeta = Media & { meta: MediaMetadata | null }

export function summarize(media: MediaAndMeta[]): MediaSummary[] {
  const msums: MediaSummary[] = []
  for (const mm of media) {
    try {
      const msum = summarizeMedia(mm)
      if (msum) msums.push(msum)
    } catch (e) {
      console.warn(`Failed to summarize [id=${mm.id}]`, e)
    }
  }
  return msums
}

export function summarizeMedia(media: MediaAndMeta): MediaSummary | undefined {
  const type = mediaType(media.mimeType)
  const isVideo = type === "video"
  const meta = media.meta!
  const mresults = resolveResults(type, media.results as CachedResults, false)
  // if this media has no cached results yet, it is still processing and should be ignored
  if (mresults.length == 0) return undefined
  const experimental = determineRelevance(type, mresults, []).experimentalReasons
  const res: MediaSummary = {
    id: media.id,
    audioId: media.audioId,
    type,
    source: determineSource(media),
    mediaUrl: media.mediaUrl,
    resolvedDate: toYMD(media.resolvedAt),
    resolvedWeek: formatYearWeek(media.resolvedAt),
    handle: meta.handle,
    keywords: meta.keywords,
    speakers: meta.speakers,
    filterTerms: Filter.makeFilterTerms(
      meta.keywords,
      meta.language,
      meta.source,
      media.external,
      experimental.length > 0,
    ),
    external: media.external,
    experimental,
    fake: determineFake(media),
    mainFake: meta.fake,
    audioFake: meta.audioFake,
    relabelFake: meta.relabelFake,
    relabelAudioFake: meta.relabelAudioFake,
    scores: summarizeScores(mresults),
    fakeVotes: countVotes(type, mresults),
    voteVerdict: computeVoteVerdict(type, mresults),
    videoObjectOverlay: isVideo ? meta.videoObjectOverlay : undefined,
    videoTextOverlay: isVideo ? meta.videoTextOverlay : undefined,
    videoEffects: isVideo ? meta.videoEffects : undefined,
    noPhotorealisticFaces: meta.noPhotorealisticFaces,
    publicComments: meta.comments,
  }

  return res
}

function filterAudioScores(results: CachedResults): CachedResults {
  const audio = {} as CachedResults
  for (const modelId in results) {
    if (models[modelId].mediaType === "audio") {
      audio[modelId] = results[modelId]
    }
  }
  return audio
}

export function audioTrackToMedia(media: MediaSummary): MediaSummary | undefined {
  if (!media.audioId) return undefined
  const results = filterAudioScores(unsummarizeScores(media.scores))
  const mresults = resolveResults("audio", results, false)
  const voteVerdict = computeVoteVerdict("audio", mresults)
  const fake = media.audioFake
  const scores = summarizeScores(mresults)
  return { ...media, id: media.id, audioId: null, type: "audio", fake, mainFake: fake, voteVerdict, scores }
}

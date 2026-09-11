import { IconType } from "react-icons"
import { AiOutlineAudio } from "react-icons/ai"
import { FaRegCheckCircle, FaRegImage } from "react-icons/fa"
import { FaRegCircleXmark, FaRegCircleQuestion } from "react-icons/fa6"
import { FiMinusCircle, FiVideo } from "react-icons/fi"
import { LuFileAudio } from "react-icons/lu"
import { MdRecordVoiceOver, MdOutlineBrokenImage, MdOutlineFaceRetouchingNatural } from "react-icons/md"
import { WandIcon } from "../components/icons"
import { AnalysisResult, Media, RequestState } from "@prisma/client"
import { fetchJson } from "../fetch"
import { MediaType, mediaType } from "./media"
import { Generator } from "../generators"
import { missingCaseError } from "../utils/missingCaseErrror"

/** Ranks enumerate the classifications provided by an _individual model_ for a piece of media. */
export const ranks = {
  unknown: {
    // note: unknown results will only be displayed internally
    shortSummary: "Unknown",
    icon: FaRegCircleQuestion,
    badgeBackground: "#374051",
    badgeText: "#FFFFFF",
    mediaBackground: "bg-slate-400",
    mediaText: "text-slate-800",
  },
  "n/a": {
    shortSummary: "Not Applicable",
    icon: FaRegCircleXmark,
    badgeBackground: "#374051",
    badgeText: "#FFFFFF",
    mediaBackground: "bg-slate-400",
    mediaText: "text-slate-800",
  },
  low: {
    shortSummary: "Little Evidence",
    icon: FaRegCheckCircle,
    badgeBackground: "#014737",
    badgeText: "#84E1BD",
    mediaBackground: "bg-manipulation-low-500",
    mediaText: "text-brand-green-900",
  },
  uncertain: {
    shortSummary: "Uncertain",
    icon: FiMinusCircle,
    badgeBackground: "#623112",
    badgeText: "#FBCA16",
    mediaBackground: "bg-manipulation-uncertain-500",
    mediaText: "text-yellow-900",
  },
  high: {
    shortSummary: "Substantial Evidence",
    icon: FaRegCircleXmark,
    badgeBackground: "#771D1D",
    badgeText: "#F8B4B5",
    mediaBackground: "bg-manipulation-high-500",
    mediaText: "text-red-50",
  },
}
export type Rank = keyof typeof ranks

export const manipulationCategoryInfo = {
  face: { label: "Faces", descrip: "Generation or manipulation of faces", icon: MdOutlineFaceRetouchingNatural },
  imagen: { label: "Generative AI", descrip: "Detects signatures of GenAI tools", icon: WandIcon },
  noise: { label: "Visual Noise", descrip: "Variations in pixels and color", icon: MdOutlineBrokenImage },
  audio: { label: "Voices", descrip: "Voice cloning or generation", icon: MdRecordVoiceOver },
  semantic: { label: "Semantic", descrip: "Semantic inconsistencies", icon: LuFileAudio },
  other: { label: "Other", descrip: "Other AI analyses", icon: FaRegCircleQuestion },
}
export type ManipulationCategory = keyof typeof manipulationCategoryInfo

/** How we incorporate this model into our result aggregation algorithm. `ignore` means we don't include it at all.
 * `include` means it gets the normal single vote. `trust` means it gets two votes. */
export type ModelPolicy = "ignore" | "include" | "trust"

export interface BaseModelInfo<T> {
  type: T
  mediaType: MediaType
  processor: Processor<any>
}

export interface ManipulationModelInfo extends BaseModelInfo<"manipulation"> {
  name: string
  descrip: string
  manipulationCategory: ManipulationCategory
  /** This model's score cutoff below which we say "low evidence". Default is 0.33. */
  uncertainScore?: number
  /** This model's score cutoff that indicates media is fake. Default is 0.5. */
  fakeScore?: number
  /** How we include (or not) this model in the aggregated results, set on a per-media-type basis. */
  policy: ModelPolicy
  /** Audio models have a separate policy for use when the audio model is evaluating a video audio track. */
  trackPolicy?: ModelPolicy
  /** Should this models score/confidence be ommitted from display to users? */
  hideScore?: boolean
  /** Should this models detail card be hidden on the analysis results page? */
  hideCard?: boolean
}

export const relevanceCategories = ["artwork", "faces", "text"] as const
export type RelevanceCategory = (typeof relevanceCategories)[number]

export interface RelevanceModelInfo extends BaseModelInfo<"relevance"> {
  relevanceCategory: RelevanceCategory
}

export type ModelInfo = ManipulationModelInfo | RelevanceModelInfo

const missingInfoProcessor: Processor<any> = {
  id: "unknown",
  name: "Unknown",
  mediaType: "unknown",
  maxPending: 0,
  adapt: () => [],
  availability: "disabled",
}

export const missingManipulationInfo = (key: string): ManipulationModelInfo => ({
  type: "manipulation",
  mediaType: "unknown",
  manipulationCategory: "other",
  processor: missingInfoProcessor,
  name: "Error",
  descrip: `Missing info for model: ${key}`,
  policy: "ignore",
})

const defaultUncertainScore = 0.33
const defaultFakeScore = 0.5

export const fakeScore = (info: ManipulationModelInfo) => info.fakeScore ?? defaultFakeScore
export const scoreMeansFake = (info: ManipulationModelInfo, score: number) => score >= fakeScore(info)

export function toRank(info: ManipulationModelInfo, prob: number): Rank {
  const uncertainScore = info.uncertainScore ?? defaultUncertainScore
  const fakeScore = info.fakeScore ?? defaultFakeScore
  return prob <= uncertainScore ? "low" : prob <= fakeScore ? "uncertain" : "high"
}

/** Returns this model's policy in the context of a `type` media item. */
export const modelPolicy = (model: ManipulationModelInfo, type: MediaType): ModelPolicy =>
  type == "video" && model.mediaType == "audio" ? model.trackPolicy ?? model.policy : model.policy

/** Manipulation models are ignored in the context of their modelPolicy.
 * For now, all other models are not ignored. */
export const shouldIgnoreModel = (model: ModelInfo, type: MediaType): boolean =>
  model.type === "manipulation" && modelPolicy(model, type) === "ignore"

/** Returns whether `model` could provide analysis of `media`. This also checks whether the model is ignored in this
 * context, in which case it does not apply. */
export function modelApplies(model: ModelInfo, media: Media) {
  const type = mediaType(media.mimeType)
  if (model.type === "relevance") {
    return type === model.mediaType
  } else if (model.type === "manipulation") {
    if (type != model.mediaType && !(media.audioId && model.mediaType == "audio")) return false
    return modelPolicy(model, type) !== "ignore"
  } else {
    throw missingCaseError(model)
  }
}

export const modelIcons: Record<MediaType, IconType> = {
  image: FaRegImage,
  video: FiVideo,
  audio: AiOutlineAudio,
  unknown: FaRegImage, // TODO
}

export type Face = {
  bounds: [number, number, number, number] // left, top, width, height
  score: number
}
export const UNKNOWN_FACE = { bounds: [-1, -1, -1, -1], score: 1 } as Face

export type Frame = {
  time: number // seconds offset into video
  faces: Face[]
}

export type GeneratorPrediction = {
  generator: Generator
  score: number
}

/** This data is cached in the `Media` table, indexed by `modelId`. */
export type CachedResult = {
  score: number
  rank: Rank
  faces?: Face[]
  generator?: GeneratorPrediction
  frames?: Frame[]
  rationale?: string
  sourceUrl?: string
}

// use some TypeScript type magic to extract the optional properties from CachedResult
type OptionalPropertyOf<T extends object> = Exclude<
  {
    [K in keyof T]: T extends Record<K, T[K]> ? never : K
  }[keyof T],
  undefined
>
type OptionalResultInfo = Pick<CachedResult, OptionalPropertyOf<CachedResult>>

/** We inflate `Record<ModelId, CachedResult>` into `ModelResult[]` at runtime. */
export type ModelResult = {
  modelId: string // ModelId but we can't type it that way due to recursion
} & CachedResult

export const mkResult = (
  modelId: string,
  rank: Rank,
  score: number,
  optional: OptionalResultInfo = {},
): ModelResult => ({ modelId, rank, score, ...optional })

export const mkModelResult = (
  modelId: string,
  modelInfo: ModelInfo,
  score: number,
  optional: OptionalResultInfo = {},
) => mkResult(modelId, modelInfo.type === "manipulation" ? toRank(modelInfo, score) : "n/a", score, optional)

export const formatPct = (score: number, decimals = 0) => `${(score * 100).toFixed(decimals)}%`
export const formatScore = (score: number) => `${formatPct(score)} confidence`

export type AnalysisResponse<T> =
  | {
      state: typeof RequestState.UPLOADING
      progress: { transferred: number; total: number }
    }
  | {
      state: typeof RequestState.PROCESSING
    }
  | {
      state: typeof RequestState.COMPLETE
      result: T
      duration: number // seconds
      raw: any // raw source JSON
    }
  | {
      state: typeof RequestState.ERROR
      error: string
      detail: any
    }

/** Creates our various analysis response types. */
export const response = {
  /** Makes a `PROCESSING` response for one of our analysis backends. */
  processing: (): AnalysisResponse<any> => ({ state: RequestState.PROCESSING }),

  /** Makes an `ERROR` response for one of our analysis backends. */
  error: (error: string, detail: any | undefined = undefined): AnalysisResponse<any> => ({
    state: RequestState.ERROR,
    error,
    detail,
  }),

  /** Makes a `COMPLETE` response for one of our analysis backends. */
  complete: <T>(result: T, created: Date, completed: Date | null): AnalysisResponse<T> => ({
    state: RequestState.COMPLETE,
    result,
    duration: mkDuration(created, completed),
    raw: result,
  }),

  /** Makes a `COMPLETE` response for one of our analysis backends. */
  cached: (result: AnalysisResult): AnalysisResponse<any> =>
    response.complete(JSON.parse(result.json), result.created, result.completed),
}

export type ProcessorAvailability = "enabled" | "disabled" | "archived"

/** Adapts a partner (or internal model) API result to our internal data model. */
export type Processor<API> = {
  /** The identifier of this partner or model. */
  id: string
  /** A human readable name for this partner or model. */
  name: string
  /** Allows us to disable backend models temporarily, or archive them semi-permanently.
   * enabled = queries from users are sent to the model
   * disabled = not in active use for users' queries, but rerun results are visible in the UI
   * archived = not in use and hidden from the UI
   * NOTE: You must still set the models associated with disabled and archived processors to "ignore"
   */
  availability: ProcessorAvailability
  /** The type of media handled by this processor. */
  mediaType: MediaType
  /** The maximum number of parallel requests to allow when re-running media. If this is set to zero it means the
   * processor runs analyses synchronously. */
  maxPending: number
  /** The maxium amount of time in ms that this processor is allowed to try processing before failing with ERROR
   * Default is PROCESSOR_TIMEOUT. */
  timeoutMs?: number
  /** The maximum size (in bytes) of media that this processor can handle. */
  maxSize?: number
  /** The maximum duration (in sections) of media that this processor can handle. */
  maxDuration?: number
  /** Checks whether the `api` response represents an error.
   * @return a string describing the error if so, `undefined` if a valid result. */
  check?: (api: API) => string | undefined
  /** Adapts the `api` response to one or more `ModelResult` objects. */
  adapt: (api: API) => ModelResult[]
}

export function isEnabled<T>(proc: Processor<T>): boolean {
  return proc.availability === "enabled"
}
export function isArchived<T>(proc: Processor<T>): boolean {
  return proc.availability === "archived"
}

/** Checks if the processor handles `media`'s main type, or if this is a video with an audio track and the processor
 * handles audio. */
export const canProcess = (processor: Processor<any>, media: Media) =>
  processor.mediaType === mediaType(media.mimeType) || (!!media.audioId && processor.mediaType === "audio")

export function mkDuration(created: Date, completed: Date | null) {
  if (!completed) return 0
  const start = created.getTime()
  const end = completed.getTime()
  if (end > start) return (end - start) / 1000
  // if the times differ by just a few milliseconds, it's probably just clock inaccuracy, ignore it
  if (start - end < 50) return 0
  console.warn(`Invalid duration: ${created} > ${completed} (delta: ${end - start})`)
  return 0
}

/** The model results cached in the database are stored as a record, indexed by `ModelId`. */
export type CachedResults = Record<string, CachedResult>

export type GetResultsResponse =
  | { state: typeof RequestState.PROCESSING; results: CachedResults; analysisTime: number; pending: string[] }
  | { state: typeof RequestState.COMPLETE; results: CachedResults; rank: Rank; analysisTime: number }
  | { state: typeof RequestState.ERROR; errors: string[] }

export const fetchResults = (mediaId: string, isAnon?: boolean): Promise<GetResultsResponse> => {
  const headers = isAnon ? { "anonymous-query": Math.floor(Math.random() * 100000).toString() } : undefined
  return fetchJson<GetResultsResponse>(
    `/api/get-results?id=${mediaId}&source=truemedia`,
    { method: "GET", headers },
    (errmsg) => {
      // if our own backend returned a non-JSON error then some infrastructural component must be (hopefully temporarily)
      // broken, so fail the promise and we'll retry
      throw new Error(errmsg)
    },
  ).then((res) => res[1])
}

const baseRankScore = {
  unknown: 0,
  "n/a": 0,
  low: 10,
  uncertain: 20,
  high: 30,
}

export const rankScore = (rank: Rank, score: number) => baseRankScore[rank] + score

export function compareResults(a: ModelResult, b: ModelResult): number {
  const as = rankScore(a.rank, a.score),
    bs = rankScore(b.rank, b.score)
  return bs - as
}

export function cachedResultEqual(a: CachedResult, b: CachedResult): boolean {
  // minimal deep equality checking that just handles JSON types AND does tolerant number equality
  function deepEquals(a: any, b: any): boolean {
    if (a === b) return true
    // numbers equal within a small degree of floating point error tolerance are also considered equal
    if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < Number.EPSILON
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false
    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) return false
      for (let ii = 0; ii < a.length; ii++) {
        if (!deepEquals(a[ii], b[ii])) return false
      }
      return true
    }
    if (Array.isArray(b)) return false
    for (const key in a) {
      if (Object.prototype.hasOwnProperty.call(a, key) && !deepEquals(a[key], b[key])) return false
    }
    for (const key in b) {
      if (
        Object.prototype.hasOwnProperty.call(b, key) &&
        b[key] !== undefined &&
        !Object.prototype.hasOwnProperty.call(a, key)
      ) {
        return false
      }
    }
    return true
  }
  return deepEquals(a, b)
}

/** Compares two `CachedResults` objects for structural equality.
 * This also compares numbers with a small floating point error tolerance to avoid spurious differences if an AI
 * decides that something is 0.0000000001 times more likely to be fake the second time around. */
export function cachedResultsEqual(a: CachedResults, b: CachedResults): boolean {
  const amodels = Object.keys(a)
  if (amodels.length != Object.keys(b).length) return false
  for (const amodel of amodels) {
    const bresult = b[amodel]
    if (!bresult || !cachedResultEqual(a[amodel], bresult)) return false
  }
  return true
}

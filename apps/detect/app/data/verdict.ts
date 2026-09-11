import { Trulean, Media, MediaMetadata } from "@prisma/client"
import { MediaType, mediaType } from "./media"
import { meansFake, meansReal, determineFake } from "./groundTruth"
import { CachedResults, ModelResult, modelPolicy, shouldIgnoreModel, ranks, scoreMeansFake } from "../data/model"
import {
  ModelId,
  models,
  manipulationModelInfo,
  ManipulationModelId,
  manipulationModels,
  isManipulationModelResult,
  modelsFor,
} from "../model-processors/all"
import { determineRelevance } from "./relevance"

/** Verdicts enumerate our aggregation of model ranks as well as other information like ground truth or the
 * trustedness of the source of the media. */
export const verdicts = {
  unknown: {
    ...ranks.unknown,
    longSummary: "Unknown",
    adjective: "unknown",
    misleadingSummary: "Human analyst labeled this misleading but couldn’t verify if manipulation present",
  },
  trusted: {
    // trusted media is treated the same as "low manipulation"
    ...ranks.low,
    longSummary: "Little Evidence of Manipulation",
    adjective: "little",
    misleadingSummary: "Verified by human analyst to not have manipulation but still be misleading",
  },
  low: {
    ...ranks.low,
    longSummary: "Little Evidence of Manipulation",
    adjective: "little",
    misleadingSummary: "Verified by human analyst to not have manipulation but still be misleading",
  },
  uncertain: {
    ...ranks.uncertain,
    longSummary: "Uncertain: Could Be Authentic or Manipulated",
    adjective: "some",
    misleadingSummary: "Human analyst labeled this misleading but couldn’t verify if manipulation present",
  },
  high: {
    ...ranks.high,
    longSummary: "Substantial Evidence of Manipulation",
    adjective: "substantial",
    misleadingSummary: "Substantial Evidence of Manipulation",
  },
}
export type Verdict = keyof typeof verdicts

export function stringToVerdict(ss: string): Verdict {
  if (verdicts[ss as Verdict]) return ss as Verdict
  return "unknown"
}

/** Resolves cached results from a media record (`Media.results`) into an array of `ModelResult`.
 * @param skipIgnored if true (the default) ignored models will be omitted from the results. */
export function resolveResults(type: MediaType, cached: CachedResults, skipIgnored = true): ModelResult[] {
  const results: ModelResult[] = []
  for (const modelId of Object.keys(cached)) {
    const model = models[modelId as ModelId]
    if (!model) console.warn(`Ignoring unknown model result [id=${modelId}]`, cached[modelId])
    else if (shouldIgnoreModel(model, type) && skipIgnored) continue
    else results.push({ modelId, ...cached[modelId] })
  }
  return results
}

function fakeVotes(type: MediaType, mr: ModelResult): number {
  const { modelId, rank, score } = mr
  const model = manipulationModels[modelId as ManipulationModelId]
  if (!model) return 0
  const policy = modelPolicy(model, type)
  const ignoreResult = rank == "n/a" || policy == "ignore"
  // "include"d models get one vote, "trust"ed models get two votes
  return ignoreResult || !scoreMeansFake(model, score) ? 0 : policy == "trust" ? 2 : 1
}

export const countVotes = (type: MediaType, results: ModelResult[]) =>
  results.map((mr) => fakeVotes(type, mr)).reduce((a, b) => a + b, 0)

/* The manipulation model decision is ready when:
   1. If we have two or more "it's fake" votes, the final results will never change
      regardless of what the remaining models report.
   2. If we have one "it's fake" vote and <= 2 remaining manipulation models. */
const determineIsVoteDecided = (type: MediaType, results: ModelResult[], pending: string[]) => {
  const votes = countVotes(type, results)
  const unreadyManipulationCount = modelsUnready(pending, (modelId) => {
    const model = models[modelId]
    return model.type === "manipulation"
  }).length
  return votes > 1 || (votes > 0 && unreadyManipulationCount <= 2)
}

/** Thresholds used to classify media, based on how many fake votes it receives. */
export const voteThresholds = {
  /** Considered fake (`high`) regardless of whether it is also tagged as experimental. */
  override: 3,
  /** Considered fake (`high`), demoted to uncertain if the media is also considered "experimental". */
  high: 2,
  /** Considered uncertain. */
  uncertain: 1,
}

/** Computes a verdict based just on the votes from the supplied model `results`. */
export function computeVoteVerdict(type: MediaType, results: ModelResult[]): Verdict {
  const votes = countVotes(type, results)
  // Special case of the day! If the verdict just barely made "high", and all the votes are coming from "visual noise"
  // models, then downgrade the verdict to "uncertain". NOTE: this logic is (unfortunately) duplicated in
  // internal/eval/metrics.ts, so change that if this changes in the future.
  if (
    votes == voteThresholds.high &&
    results.filter(isManipulationModelResult).every((mr) => {
      const model = manipulationModelInfo(mr.modelId)
      return model.manipulationCategory === "noise" || fakeVotes(type, mr) == 0
    })
  ) {
    return "uncertain"
  }
  return votes >= voteThresholds.high ? "high" : votes >= voteThresholds.uncertain ? "uncertain" : "low"
}

// The ensemble here is an experimental alternative to the voting-style verdict
// used today. The ensemble described by `EnsembleInfo` is not used in production,
// but you can see the results of this alternative in the internal Eval page.
type EnsembleInfo = {
  weights: Record<ModelId, number>
  intercept: number
  defaultScore: number
  lowCutoff: number
  highCutoff: number
}

const ensembleInfo: Record<MediaType, EnsembleInfo> = {
  image: {
    weights: {
      "aion-image": 2.971656513770502,
      "hive-image-genai-v2": 1.545193650311533,
      dire: 1.6927661260249207,
      "sensity-image": 3.276330626940431,
      ufd: 4.273897843719448,
      transcript: 1.769443248756824,
    },
    intercept: -4.34078763,
    defaultScore: 0.25,
    lowCutoff: 0.2,
    highCutoff: 0.6,
  },
  video: {
    weights: {
      genconvit: 0.8200481702437947,
      "hive-video": 1.5159777619638455,
      "rd-erie-vid": 1.2589527730553662,
      "rd-vid-ensemble": -0.6899456243815848,
      "sensity-video": 2.2836340684036363,
    },
    intercept: -2.20762611,
    defaultScore: 0.25,
    lowCutoff: 0.2,
    highCutoff: 0.6,
  },
  audio: {
    weights: {
      dftotal: 3.433869788906951,
      "hive-audio": 0.8355853576444219,
      "rd-aud-ensemble": 0.5122791040606058,
      "rd-everest-aud": 1.0688314300078539,
    },
    intercept: -2.67040389,
    defaultScore: 0.25,
    lowCutoff: 0.3,
    highCutoff: 0.6,
  },
  unknown: {
    weights: {},
    intercept: 0,
    defaultScore: 0.25,
    lowCutoff: 0.25,
    highCutoff: 0.75,
  },
}

const ensembleVerdicts: Verdict[] = ["low", "uncertain", "high"]

export function computeEnsembleVerdict(type: MediaType, results: { modelId: ModelId; score: number }[]): Verdict {
  function computeVerdictIndex(type: MediaType): number {
    const { weights, intercept, defaultScore, lowCutoff, highCutoff } = ensembleInfo[type]
    let combo = intercept // combo = affine combination of inputs
    const seen = new Set<ModelId>()
    for (const { modelId, score } of results) {
      // if the model does not match the type we're looking for, skip this result
      if (models[modelId as ModelId]?.mediaType !== type) continue
      seen.add(modelId)
      // if we don't have a weight for this result, it contributes zero to the ensemble score
      const weight = weights[modelId] ?? 0
      combo = combo + weight * score
    }
    // we need to include any "missed" models with a default score
    for (const modelId in weights) {
      if (seen.has(modelId)) continue
      combo = combo + weights[modelId] * defaultScore
    }
    const ensembleScore = Math.exp(combo) / (1 + Math.exp(combo))
    return ensembleScore <= lowCutoff ? 0 : ensembleScore >= highCutoff ? 2 : 1
  }

  let verdictIndex = computeVerdictIndex(type)
  // for videos, we use the "faker" of the video verdict and the audio verdict
  if (type === "video") verdictIndex = Math.max(verdictIndex, computeVerdictIndex("audio"))
  return ensembleVerdicts[verdictIndex]
}

/* Which models that follow the given predicate are still pending? */
export const modelsUnready = (pending: string[], predicate: (value: ModelId) => boolean) =>
  pending.flatMap((procId) => modelsFor(procId)).filter(predicate)

export type ExperimentalReason = "faces-too-many" | "faces-too-few" | "artwork" | "text"

export type VerdictResult = {
  showResults: boolean // whether or not to show these results (depends on how many models are ready)
  verdict: Verdict // the verdict to show to the user
  voteVerdict: Verdict // the verdict just based on model votes
  ensembleVerdict: Verdict // the verdict based on our ensemble model
  definitiveVerdict: Verdict // the verdict based on ground truth or a verified source
  experimentalVerdict: Verdict // the verdict to show in situations where we share experimental status
  experimentalReasons: ExperimentalReason[] // why is this an "experimental" result?
}

const unknownResult = {
  showResults: false,
  verdict: "unknown",
  voteVerdict: "unknown",
  ensembleVerdict: "unknown",
  definitiveVerdict: "unknown",
  experimentalVerdict: "unknown",
  experimentalReasons: [],
} as VerdictResult

// exported so that we can test verdict computation without having to gin up a fake media record
export function computeVerdict(
  type: MediaType,
  fake: Trulean,
  verified: boolean,
  ready: ModelResult[],
  pending: string[],
): VerdictResult {
  // We definitively know the verdict if we have a ground truth, or it's a trusted source.
  const definitiveVerdict: Verdict | undefined = meansFake(fake)
    ? "high"
    : verified
      ? "trusted"
      : meansReal(fake)
        ? "low"
        : undefined

  const isManipulationDecided = determineIsVoteDecided(type, ready, pending)
  const relevance = determineRelevance(type, ready, pending)

  // Show the results even before all of the models have completed, per some rules:
  // 1. Don't show results until we have at least one completed manipulation model result.
  // 2. If we have a definitive result, from a trusted source or ground truth
  // 3. If either the manipulation vote is decided OR we are certain this is experimental
  // Whenever we have pending analyses we will show a message indicating that we're still waiting and that this
  // verdict is preliminary.
  const unreadyCount = pending.length
  const showResults =
    ready.filter(isManipulationModelResult).length > 0 &&
    (unreadyCount == 0 || !!definitiveVerdict || isManipulationDecided || relevance.isRelevanceDecided)

  // what is the verdict on this media purely based on the analysis results
  const voteCount = countVotes(type, ready)
  const voteVerdict = computeVoteVerdict(type, ready)
  // Override that verdict if we lack enough results, or have a definitive verdict
  const verdict = !showResults ? "unknown" : definitiveVerdict !== undefined ? definitiveVerdict : voteVerdict
  // compute our ensemble verdict and include it in addition to the vote verdict
  const ensembleVerdict = computeEnsembleVerdict(type, ready)

  const experimentalReasons =
    showResults && !definitiveVerdict && voteCount < voteThresholds.override ? relevance.experimentalReasons : []

  return {
    showResults,
    verdict,
    voteVerdict,
    ensembleVerdict,
    definitiveVerdict: definitiveVerdict ?? "unknown",
    experimentalVerdict: experimentalReasons.length > 0 ? "uncertain" : verdict,
    experimentalReasons,
  }
}

/** Computes the verdict for `media` based on its cached results. If the media analysis is not yet complete and it
 * lacks cached results, `unknown` is returned. */
export function mediaVerdict(media: Media & { meta: MediaMetadata | null }): VerdictResult {
  const type = mediaType(media.mimeType)
  const cached = media.results as CachedResults
  if (Object.keys(cached).length === 0) return unknownResult
  return computeVerdict(type, determineFake(media), media.verifiedSource, resolveResults(type, cached), [])
}

export const determineVerdict = (
  media: Media & { meta: MediaMetadata | null },
  ready: ModelResult[],
  pending: string[],
): VerdictResult =>
  computeVerdict(mediaType(media.mimeType), determineFake(media), media.verifiedSource, ready, pending)

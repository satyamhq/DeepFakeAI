import { MediaType } from "../data/media"
import { meansFake, meansUnknown } from "../data/groundTruth"
import { ModelPolicy, ManipulationModelInfo, modelPolicy, fakeScore, isEnabled } from "../data/model"
import { voteThresholds, computeEnsembleVerdict } from "../data/verdict"
import { ManipulationModelId, ModelId, isArchived, manipulationModels } from "../model-processors/all"
import { MediaSummary } from "./summarize"

const safeRatio = (num: number, den: number) => (den > 0 ? num / den : 0)

export type Policies = Record<ModelId, ModelPolicy>

export function defaultPolicies(type: MediaType): Policies {
  const policies: Record<string, ModelPolicy> = {}
  for (const [modelId, model] of Object.entries(manipulationModels)) {
    policies[modelId] = modelPolicy(model, type)
  }
  return policies as Policies
}

export function explorePolicies(type: MediaType, op: (policies: Policies) => void) {
  const modelApplies = (mlt: MediaType, mdt: MediaType) => mlt == mdt || (mdt == "video" && mlt == "audio")
  const exploredModels = Object.entries(manipulationModels)
    .filter((mm) => isEnabled(mm[1].processor) && modelApplies(mm[1].mediaType, type))
    .map((ee) => ee[0])
  // console.log(`Exploring policies [type=${type}, models=${manipulationModelInfo.map(mm => mm[0])}]`)
  function explore(policy: Record<string, ModelPolicy>, offset: number) {
    if (offset >= exploredModels.length) {
      op(policy as Policies)
      return
    }
    const modelId = exploredModels[offset]
    const next: Record<string, ModelPolicy> = { ...policy, [modelId]: "ignore" }
    explore(next, offset + 1)
    next[modelId] = "include"
    explore(next, offset + 1)
    next[modelId] = "trust"
    explore(next, offset + 1)
  }
  const policies: Record<string, ModelPolicy> = {}
  for (const modelId of Object.keys(manipulationModels)) {
    policies[modelId] = "ignore"
  }
  explore(policies, 0)
}

export function summarizePolicies(policies: Policies) {
  const ppo = Object.entries(policies)
  const ignored = ppo
    .filter((pp) => pp[1] == "ignore")
    .map((pp) => pp[0])
    .join(", ")
  const included = ppo
    .filter((pp) => pp[1] == "include")
    .map((pp) => pp[0])
    .join(", ")
  const trusted = ppo
    .filter((pp) => pp[1] == "trust")
    .map((pp) => pp[0])
    .join(", ")
  return { ignored, included, trusted }
}

export type Stats = {
  total: number
  truePos: number
  falsePos: number
  trueNeg: number
  falseNeg: number
  accuracy: number
  f1: number
  precision: number
  recall: number
  negAcc: number
  fpRate: number
  fnRate: number
}

export abstract class Eval {
  truePos = 0
  falsePos = 0
  trueNeg = 0
  falseNeg = 0

  get total(): number {
    return this.truePos + this.trueNeg + this.falsePos + this.falseNeg
  }
  get empty() {
    return this.total == 0
  }

  get fake(): number {
    return this.truePos + this.falseNeg
  }
  get real(): number {
    return this.falsePos + this.trueNeg
  }
  get positive(): number {
    return this.truePos + this.falsePos
  }
  get negative(): number {
    return this.trueNeg + this.falseNeg
  }
  get right(): number {
    return this.truePos + this.trueNeg
  }
  get wrong(): number {
    return this.falsePos + this.falseNeg
  }

  get accuracy(): number {
    return safeRatio(this.right, this.right + this.wrong)
  }
  get precision(): number {
    return safeRatio(this.truePos, this.positive)
  }
  get recall(): number {
    return safeRatio(this.truePos, this.fake)
  }
  get f1(): number {
    const { precision, recall } = this
    return safeRatio(2 * (precision * recall), precision + recall)
  }
  get negAcc(): number {
    return safeRatio(this.trueNeg, this.real)
  }
  get fpRate(): number {
    return safeRatio(this.falsePos, this.real)
  }
  get fnRate(): number {
    return safeRatio(this.falseNeg, this.fake)
  }

  get stats(): Stats {
    return {
      total: this.total,
      truePos: this.truePos,
      falsePos: this.falsePos,
      trueNeg: this.trueNeg,
      falseNeg: this.falseNeg,
      accuracy: this.accuracy,
      f1: this.f1,
      precision: this.precision,
      recall: this.recall,
      negAcc: this.negAcc,
      fpRate: this.fpRate,
      fnRate: this.fnRate,
    }
  }

  abstract get name(): string

  reset(): void {
    this.truePos = 0
    this.trueNeg = 0
    this.falsePos = 0
    this.falseNeg = 0
  }

  protected note(isFake: boolean, judgedFake: boolean) {
    if (isFake) {
      if (isFake == judgedFake) this.truePos += 1
      else this.falseNeg += 1
    } else {
      if (isFake == judgedFake) this.trueNeg += 1
      else this.falsePos += 1
    }
  }
}

export class SingleModelEval extends Eval {
  key: ManipulationModelId
  model: ManipulationModelInfo

  constructor(key: ManipulationModelId) {
    super()
    this.key = key
    this.model = manipulationModels[key]
  }

  get name(): string {
    return this.key
  }

  get fakeScore(): number {
    return fakeScore(this.model)
  }

  apply(isFake: boolean, scores: Record<string, number>) {
    this.applyScore(isFake, scores[this.key])
  }
  applyScore(isFake: boolean, score: number) {
    if (score >= 0) this.note(isFake, score >= this.fakeScore)
  }

  static compare(a: SingleModelEval, b: SingleModelEval) {
    return a.key.localeCompare(b.key)
  }
}

export type AggStats = Stats & {
  indetReal: number
  indetFake: number
  falsePosRate: number
}

export abstract class AggEval extends Eval {
  indetReal = 0
  indetFake = 0

  get total(): number {
    return this.truePos + this.trueNeg + this.falsePos + this.falseNeg + this.indetReal + this.indetFake
  }

  get recall(): number {
    return safeRatio(this.truePos, this.fake + this.indetFake)
  }

  get falsePosRate(): number {
    return safeRatio(this.falsePos, this.real + this.indetReal)
  }

  get aggStats(): AggStats {
    return { ...this.stats, indetReal: this.indetReal, indetFake: this.indetFake, falsePosRate: this.falsePosRate }
  }

  reset(): void {
    super.reset()
    this.indetReal = 0
    this.indetFake = 0
  }
}

export class VoteEval extends AggEval {
  readonly name = "Aggregate"

  apply(isFake: boolean, isExperimental: boolean, scores: Record<string, number>, policies: Policies) {
    let nonNoiseFakes = 0
    let results = 0
    let votes = 0
    for (const modelId in scores) {
      const model = manipulationModels[modelId as ModelId]
      if (!model) continue // not a manipulation model
      const score = scores[modelId]
      if (score < 0) continue
      const policy = policies[modelId as ModelId]
      if (policy == "ignore") continue
      results += 1
      // trusted models count for two votes (they alone can make media red)
      if (score >= fakeScore(model)) {
        votes += policy == "trust" ? 2 : 1
        // track whether a non-noise model claimed this was fake
        if (model.manipulationCategory !== "noise") nonNoiseFakes += 1
      }
    }

    // if we have no results, or all "n/a" results, skip this media
    if (results == 0) return

    // replicate our noise model special casing from verdict.ts here... alas there is no good way to factor this
    if (votes == 2 && nonNoiseFakes == 0) votes = 1

    const trustVotes = !isExperimental || votes >= voteThresholds.override
    // if this is red (votes >= 2) or green (votes < 1), and not experimental, track stats for it
    const votedFake = votes >= voteThresholds.high
    if (trustVotes && (votedFake || votes < voteThresholds.uncertain)) this.note(isFake, votedFake)
    // otherwise we're reporting it as yellow/uncertain/indeterminate so track it separately
    else if (isFake) this.indetFake += 1
    else this.indetReal += 1
  }
}

export class EnsembleEval extends AggEval {
  readonly name = "Ensemble"
  readonly type: MediaType

  constructor(type: MediaType) {
    super()
    this.type = type
  }

  apply(isFake: boolean, isExperimental: boolean, scores: Record<string, number>) {
    const results = Object.entries(scores).map(([modelId, score]) => ({ modelId, score }))
    const verdict = computeEnsembleVerdict(this.type, results)
    // TODO: decide if we want a sufficiently high ensemble score to override experimental
    if (verdict == "uncertain" || isExperimental) {
      // otherwise we're reporting it as "indeterminate" so track it separately
      if (isFake) this.indetFake += 1
      else this.indetReal += 1
    } else if (verdict == "low") this.note(isFake, false)
    else if (verdict == "high") this.note(isFake, true)
  }
}

export class ModelMetrics {
  count = 0
  real = 0
  fake = 0
  unknown = 0

  readonly type: MediaType
  readonly evals: SingleModelEval[]

  constructor(type: MediaType) {
    this.type = type
    this.evals = Object.keys(manipulationModels)
      .map((mm) => mm as ManipulationModelId)
      .filter((mm) => type == manipulationModels[mm].mediaType)
      .filter((mm) => !isArchived(mm))
      .map((model) => new SingleModelEval(model))
  }

  evalFor(model: string): SingleModelEval | undefined {
    for (const ee of this.evals) {
      if (ee instanceof SingleModelEval && ee.key == model) return ee
    }
    return undefined
  }

  note(msum: MediaSummary) {
    this.count += 1
    // when evaluating individual models, we want the ground truth for the appropriate track
    const fake = this.type == "audio" && msum.type == "video" ? msum.audioFake : msum.mainFake
    if (meansUnknown(fake)) this.unknown += 1
    else {
      const isFake = meansFake(fake)
      if (isFake) this.fake += 1
      else this.real += 1
      for (const ev of this.evals) ev.apply(isFake, msum.scores)
    }
  }
}

export class MediaMetrics {
  private modelIds = new Set<string>()
  count = 0
  real = 0
  fake = 0
  unknown = 0

  readonly type: MediaType
  get models(): ModelId[] {
    return Array.from(this.modelIds) as ModelId[]
  }

  policies: Policies
  readonly aggregate = new VoteEval()
  readonly ensemble: EnsembleEval

  get trusted() {
    return this.models.filter((mm) => this.policies[mm] == "trust")
  }

  constructor(type: MediaType, policies: Policies) {
    this.type = type
    this.policies = policies
    this.ensemble = new EnsembleEval(type)
  }

  note(msum: MediaSummary) {
    this.count += 1
    if (meansUnknown(msum.fake)) this.unknown += 1
    else {
      for (const modelId of Object.keys(msum.scores)) {
        if (!isArchived(modelId) && manipulationModels[modelId]) this.modelIds.add(modelId)
      }
      const isFake = meansFake(msum.fake)
      if (isFake) this.fake += 1
      else this.real += 1
      const isExperimental = msum.experimental.length > 0
      this.aggregate.apply(isFake, isExperimental, msum.scores, this.policies)
      this.ensemble.apply(isFake, isExperimental, msum.scores)
    }
  }

  reset() {
    this.count = 0
    this.real = 0
    this.fake = 0
    this.unknown = 0
    this.aggregate.reset()
  }
}

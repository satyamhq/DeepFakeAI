import { determineFake } from "../../data/groundTruth"
import { JoinedMedia } from "../../data/media"
import { ManipulationCategory, mkResult, modelApplies, ModelResult } from "../../data/model"
import { Verdict } from "../../data/verdict"
import { isManipulationModelResult, manipulationModelInfo, modelsFor } from "../../model-processors/all"

export function gatherAnalysisCategories({
  media,
  ready,
  pending = [],
}: {
  media: JoinedMedia
  ready: ModelResult[]
  pending?: string[]
}) {
  const analysisRanks = {} as Record<ManipulationCategory, ModelResult[]>
  for (const mr of ready.filter(isManipulationModelResult)) {
    const info = manipulationModelInfo(mr.modelId)
    if (info.hideCard) continue
    analysisRanks[info.manipulationCategory] ??= []
    analysisRanks[info.manipulationCategory].push(mr)
  }
  for (const procId of pending) {
    for (const modelId of modelsFor(procId)) {
      const info = manipulationModelInfo(modelId)
      if (!modelApplies(info, media)) continue
      analysisRanks[info.manipulationCategory] ??= []
      analysisRanks[info.manipulationCategory].push(mkResult(modelId, "unknown", 0))
    }
  }

  // Skip the categories where every model is not applicable
  for (const cat of Object.keys(analysisRanks) as ManipulationCategory[]) {
    const results = analysisRanks[cat]
    if (results.every((mr) => mr.rank == "n/a")) {
      delete analysisRanks[cat]
    }
  }

  return analysisRanks
}

// Ordering of the categories as displayed in the UI
const analysisSortValue: Record<ManipulationCategory, number> = {
  imagen: 0,
  face: 1,
  noise: 2,
  audio: 3,
  semantic: 4,
  other: 5,
}

export const compareCategories = (a: string, b: string) =>
  analysisSortValue[a as ManipulationCategory] - analysisSortValue[b as ManipulationCategory]

export const isMisleadingUnknown = ({ media, verdict }: { media: JoinedMedia; verdict: Verdict }) => {
  const groundTruth = determineFake(media)
  const isMisleading = media.meta?.misleading ?? false
  // Even if a source is trusted it may still be considered misleading.
  return (
    isMisleading && groundTruth === "UNKNOWN" && (verdict == "low" || verdict == "uncertain" || verdict == "trusted")
  )
}

export const isMisleadingReal = ({ media }: { media: JoinedMedia }) => {
  const groundTruth = determineFake(media)
  const isMisleading = media.meta?.misleading ?? false
  return isMisleading && groundTruth === "FALSE"
}

export const shouldShowMisleadingLabel = ({ media, verdict }: { media: JoinedMedia; verdict: Verdict }) =>
  isMisleadingUnknown({ media, verdict }) || isMisleadingReal({ media })

import { AnalysisResult } from "@prisma/client"
import { MediaType } from "../../data/media"
import { CachedResults } from "../../data/model"
import { externalManipulationModelIds } from "../../model-processors/all"
import { DecoratedResults, toExternal } from "../get-results/actions"

export function toExternalForCheckAnalysis({
  type,
  cached,
  analysisResults,
  includeIgnoredModels = false,
}: {
  type: MediaType
  cached: CachedResults
  analysisResults: AnalysisResult[]
  includeIgnoredModels: boolean
}): DecoratedResults {
  const modelNamesMap = externalManipulationModelIds
  return toExternal({ type, cached, analysisResults, includeIgnoredModels, modelNamesMap })
}

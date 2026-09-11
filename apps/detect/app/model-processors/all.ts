import { MediaType } from "../data/media"
import {
  ManipulationModelInfo,
  ModelInfo,
  ModelResult,
  Processor,
  RelevanceModelInfo,
  missingManipulationInfo,
} from "../data/model"
import { processors as aionProcessors, models as aionModels } from "./aion"
import { processors as dftotalProcessors, models as dftotalModels } from "./dftotal"
import {
  processors as hiveProcessors,
  manipulationModels as hiveManipulationModels,
  relevanceModels as hiveRelevanceModels,
} from "./hive"
import { processors as loccusProcessors, models as loccusModels } from "./loccus"
import { processors as realityProcessors, models as realityModels } from "./reality"
import {
  processors as sensityProcessors,
  manipulationModels as sensityManipulationModels,
  relevanceModels as sensityRelevanceModels,
} from "./sensity"
import {
  processors as trueProcessors,
  manipulationModels as trueManipulationModels,
  relevanceModels as trueRelevanceModels,
} from "./truemedia"
import {
  processors as openAiProcessors,
  relevanceModels as openAiRelevanceModels,
  manipulationModels as openAiManipulationModels,
} from "./openai"
import { StarterId } from "../api/starters/types"

export const processors: Record<string, Processor<any>> = {
  ...aionProcessors,
  ...dftotalProcessors,
  ...hiveProcessors,
  ...loccusProcessors,
  ...realityProcessors,
  ...sensityProcessors,
  ...trueProcessors,
  ...openAiProcessors,
}

export const getApplicableProcessors = (type: MediaType) =>
  Object.values(processors).filter((proc) => proc.mediaType === type)

export const manipulationModels = {
  ...aionModels,
  ...dftotalModels,
  ...hiveManipulationModels,
  ...loccusModels,
  ...realityModels,
  ...sensityManipulationModels,
  ...trueManipulationModels,
  ...openAiManipulationModels,
} as Record<string, ManipulationModelInfo>

export const relevanceModels = {
  ...hiveRelevanceModels,
  ...sensityRelevanceModels,
  ...trueRelevanceModels,
  ...openAiRelevanceModels,
} as Record<string, RelevanceModelInfo>

export const models = { ...manipulationModels, ...relevanceModels } as Record<string, ModelInfo>

export type ModelId = keyof typeof models
export type ManipulationModelId = keyof typeof manipulationModels

/** The id shown to third parties when a model is included in API results. We do not want to use our internal ids
 * because those expose information about which partner computed which result. Partners do not want us to expose
 * that. */
export const externalManipulationModelIds: Record<ManipulationModelId, string> = {
  // video models
  "hive-video": "video1",
  "rd-vid-ensemble": "video2",
  "rd-huron-vid": "video3",
  "rd-erie-vid": "video4",
  "rd-tahoe-vid": "video5",
  "sensity-video": "video6",
  styleflow: "video8",
  genconvit: "video9",
  ftcn: "video10",
  "hive-video-facemap-v2": "video11",
  "hive-video-genai-v2": "video12",

  // image models
  "hive-image": "image1",
  "rd-img-ensemble": "image2",
  "rd-pine-img": "image3",
  "rd-oak-img": "image4",
  "rd-elm-img": "image5",
  "rd-cedar-img": "image6",
  "sensity-image": "image7",
  dire: "image8",
  "aion-image": "image9",
  "reverse-search": "image14",
  ufd: "image19",
  "hive-image-facemap-v2": "image20",
  "hive-image-genai-v2": "image21",

  // audio models
  "hive-audio": "audio1",
  "rd-aud-ensemble": "audio2",
  "rd-everest-aud": "audio3",
  "rd-tak22-aud": "audio4",
  "sensity-voice": "audio5",
  "aion-audio": "audio6",
  dftotal: "audio7",
  buffalo: "audio8",
  "loccus-audio": "audio10",
  transcript: "audio11",
}

export const internalIdForExternalId = (anonKey: string) => {
  for (const modelId of Object.keys(externalManipulationModelIds)) {
    if (externalManipulationModelIds[modelId] === anonKey) {
      return modelId
    }
  }
  return null
}

export const processorsForModels = (modelIds: StarterId[]) => {
  const procIds: StarterId[] = []
  for (const modelId of modelIds) {
    const model = models[modelId as ModelId]
    const procId = model.processor.id as StarterId
    if (!procIds.includes(procId)) procIds.push(procId)
  }
  return procIds
}

export const manipulationModelInfo = (key: string): ManipulationModelInfo =>
  manipulationModels[key as ManipulationModelId] ?? missingManipulationInfo(key)

export function isManipulationModelResult(result: ModelResult): boolean {
  const model = models[result.modelId as ModelId]
  return !!model && model.type === "manipulation"
}

export function isArchived(modelId: ModelId): boolean {
  const model = models[modelId]
  return !!model && model.processor.availability === "archived"
}

function computeModelsFor(proc: string): ModelId[] {
  const pmodels: ModelId[] = []
  for (const modelId in models) {
    if (models[modelId as ModelId].processor.id == proc) pmodels.push(modelId as ModelId)
  }
  return pmodels
}
const cachedModels = new Map<string, ModelId[]>()

/** Returns the ids of models associated with processor `proc`. */
export function modelsFor(proc: string): ModelId[] {
  let models = cachedModels.get(proc)
  if (models) return models
  models = computeModelsFor(proc)
  cachedModels.set(proc, models)
  return models
}

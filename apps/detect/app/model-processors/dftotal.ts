import { ManipulationModelInfo, Processor, mkModelResult } from "../data/model"

export type ApiResponse = {
  score: number
  // TODO: what do error results look like?
  error?: string
}

const id = "dftotal"

const processor: Processor<ApiResponse> = {
  id,
  name: "Deepfake Total",
  mediaType: "audio",
  maxPending: 0,
  maxSize: 20 * 1024 * 1024,
  check: (res) => res.error,
  adapt: (api) => {
    const score = api.score / 100
    return [mkModelResult(id, models.dftotal, score)]
  },
  availability: "enabled",
}

const model: ManipulationModelInfo = {
  type: "manipulation",
  mediaType: "audio",
  manipulationCategory: "audio",
  processor,
  name: "Voice Anti-Spoofing Analysis",
  descrip: "Analyzes audio for evidence that it was created by an AI audio generator.",
  policy: "include",
  trackPolicy: "include",
}

export const models = { [id]: model }
export const processors = { [id]: processor }

import { ManipulationModelInfo, Processor, mkModelResult } from "../data/model"

export type ErrorResponse = {
  message: string
}

export type UploadResponse = {
  id: string
  handle: string
  alias: string
  duration: string // number?
  voiceDuration: string // number?
  frequency: number
  identity: string | null
  state: string // 'available'?
  uploadedAt: string
}

export type VerifyResponse = {
  id: string
  handle: string
  alias: string
  model: {
    handle: string
    version: string
  }
  audio: {
    handle: string
    alias: string
  }
  score: number
  subscores: {
    synthesis: number
    replay: number
  }
  performedAt: string
}

// Loccus requires that we send them audio as a base64 encoded string. If the source audio file is too large, the
// base64 encoded string will be so large that it will crash the Node VM, so we refuse to even attempt to send media to
// Loccus that is larger than 32MB.
export const MaxMediaMB = 32

export const audioId = "loccus-audio"
const audioProcessor: Processor<VerifyResponse | ErrorResponse> = {
  id: audioId,
  name: "Hiya AI (Loccus)", // Loccus was acquired by Hiya and the model is called "Hiya AI Voice Detection"
  mediaType: "audio",
  maxPending: 0,
  maxSize: MaxMediaMB * 1024 * 1024,
  maxDuration: 5 * 60,
  check: (res) => ("message" in res ? res.message : undefined),
  adapt: (res) => {
    // we can safely cast to VerifyResponse here because `check` will have handled the error case
    const api = res as VerifyResponse
    // their documentation reads like it was written by an inebriated badger, but my best guess is that 0 means fake
    // and 1 means real, which is the inverse of what we want, hence the 1-score
    const score = 1 - (api.subscores ? api.subscores.synthesis : api.score)
    return [mkModelResult(audioId, audioModel, score)]
  },
  availability: "disabled",
}
const audioModel: ManipulationModelInfo = {
  type: "manipulation",
  mediaType: "audio",
  manipulationCategory: "audio",
  processor: audioProcessor,
  name: "Audio Authenticity Detector",
  descrip: "Analyzes audio for evidence that it was created by an AI generator or cloning.",
  policy: "ignore",
  trackPolicy: "ignore",
}

export const models = {
  [audioId]: audioModel,
}

export const processors = {
  [audioId]: audioProcessor,
}

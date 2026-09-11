import { ModelInfo, Processor, mkModelResult, mkResult } from "../data/model"

export enum YesNo {
  YES = "YES",
  NO = "NO",
  UNKNOWN = "UNKNOWN",
}

export type YesNoResponse = {
  answer: YesNo
  requestId?: string
  rationale?: string
  sourceUrl?: string
  transcript?: string
  lyricsPromptResponse?: string
}

const textId = "openai-text"
const artworkId = "openai-artwork"
const audioTranscriptId = "transcript"

const textProcessor: Processor<YesNoResponse> = {
  id: textId,
  name: "ChatGPT Text Detection",
  mediaType: "image",
  maxPending: 0,
  check: (res) => (!res ? "no usable result from ChatGPT" : undefined),
  adapt: (res) => {
    const score = res.answer === YesNo.YES ? 1 : 0
    return [mkResult(textId, "n/a", score)]
  },
  availability: "enabled",
}

const artworkProcessor: Processor<YesNoResponse> = {
  id: artworkId,
  name: "ChatGPT Artwork Analysis",
  mediaType: "image",
  maxPending: 0,
  check: (res) => (!res ? "no usable result from ChatGPT" : undefined),
  adapt: (res) => {
    const score = res.answer === YesNo.YES ? 1 : 0
    return [mkResult(artworkId, "n/a", score)]
  },
  availability: "enabled",
}

const transcriptProcessor: Processor<YesNoResponse> = {
  id: audioTranscriptId,
  name: "Audio Transcript Analysis",
  mediaType: "audio",
  maxPending: 0,
  check: (res) => (!res ? "no usable result from ChatGPT" : undefined),
  adapt: (res) => {
    if (res.answer === YesNo.UNKNOWN) {
      return [mkResult(audioTranscriptId, "n/a", 0, { rationale: res.rationale })]
    }

    const score = res.answer === YesNo.YES ? 1 : 0
    return [mkModelResult(audioTranscriptId, audioTranscriptModel, score, { rationale: res.rationale })]
  },
  availability: "enabled",
}

const textModel: ModelInfo = {
  type: "relevance",
  mediaType: "image",
  relevanceCategory: "text",
  processor: textProcessor,
}

const artworkModel: ModelInfo = {
  type: "relevance",
  mediaType: "image",
  relevanceCategory: "artwork",
  processor: artworkProcessor,
}

const audioTranscriptModel: ModelInfo = {
  type: "manipulation",
  mediaType: "audio",
  manipulationCategory: "semantic",
  processor: transcriptProcessor,
  name: "Audio Transcript Analysis",
  descrip: "Uses semantic understanding of speech to detect misleading audio.",
  policy: "include",
  trackPolicy: "include",
  hideScore: true,
}

export const relevanceModels = { [textId]: textModel, [artworkId]: artworkModel }
export const manipulationModels = {
  [audioTranscriptId]: audioTranscriptModel,
}
export const processors = {
  [textId]: textProcessor,
  [artworkId]: artworkProcessor,
  [audioTranscriptId]: transcriptProcessor,
}

import {
  Processor,
  mkResult,
  mkModelResult,
  ManipulationModelInfo,
  UNKNOWN_FACE,
  RelevanceModelInfo,
} from "../data/model"

export type ApiResponse = {
  error?: string
  event_type: string
  id: string
  preview: string
  status: string // completed, failed, ?
}

type Track = {
  bbox: [number, number, number, number]
  frame_ms: number
  frame_idx: number
  frame_rate: number
}

export type FakeExplanation = {
  fake_bbox: [number, number]
  fake_bbox_average_size: [number, number]
  fake_face?: string // base64 encoded image
  fake_frame_idx: number
  fake_frame_ms: number
  fake_probability: number
  id: number
  tracks: Track[]
}

export type FaceApiResult = {
  class_name: string // real, fake, ?
  class_probability: number
  explanation?: FakeExplanation[]
}

export type FaceApiResponse = ApiResponse & {
  no_faces: boolean
  result: FaceApiResult
}

export type ImageExplanation = {
  type: string // GANDetectorExplanation, ?
  details: {
    eye_mouth_overlays_image: string
    image_url: string
    source: string
    text_prompt: string
    timestamp: string
  }
}

export type ImageApiResult = {
  class_name: string // real, fake, ?
  class_probability: number
  explanation?: ImageExplanation
}

export type ImageApiResponse = ApiResponse & {
  result: ImageApiResult
}

export type VoiceExplanation = {
  id: string
  fake_frame_ms: number
  fake_probability: number
}

export type VoiceApiResult = {
  class_name: string // real, fake, ?
  class_probability: number
  audio_frames_processed: number
  explanation?: VoiceExplanation[]
}

export type VoiceApiResponse = ApiResponse & {
  result: VoiceApiResult
}

const imageId = "sensity-image"
const imageProcessor: Processor<ImageApiResponse> = {
  id: imageId,
  name: "Sensity.ai",
  mediaType: "image",
  maxPending: 3,
  maxSize: 32 * 1024 * 1024,
  timeoutMs: 30 * 60 * 1000, // 30 minutes
  check: (res) => (res.error ? res.error : res.status == "failed" ? "Analysis failed." : undefined),
  adapt: (res) => [
    res.result.class_name == "real"
      ? mkResult(imageId, "low", 0)
      : mkModelResult(imageId, imageModel, res.result.class_probability),
  ],
  availability: "enabled",
}
const imageModel: ManipulationModelInfo = {
  type: "manipulation",
  mediaType: "image",
  manipulationCategory: "imagen",
  processor: imageProcessor,
  name: "AI-Generated Image Detector",
  uncertainScore: 0.1,
  descrip: "Detects AI-generated, photorealistic images created by Stable Diffusion, MidJourney, DALL·E 2 and others.",
  policy: "include",
}

const videoId = "sensity-video"
const videoProcessor: Processor<FaceApiResponse> = {
  id: videoId,
  name: "Sensity.ai",
  mediaType: "video",
  maxPending: 3,
  maxSize: 32 * 1024 * 1024,
  maxDuration: 30 * 60,
  timeoutMs: 30 * 60 * 1000, // 30 minutes
  check: (res) => (res.error ? res.error : res.status == "failed" ? "Analysis failed." : undefined),
  adapt: (res) => {
    const faces = res.no_faces ? [] : [UNKNOWN_FACE]
    const faceRelevance = mkModelResult(videoFaceRelevanceId, videoFaceRelevanceModel, 0, { faces })
    return [
      faceRelevance,
      res.no_faces
        ? mkResult(videoId, "n/a", 0)
        : res.result.class_name == "real"
          ? mkResult(videoId, "low", 0)
          : mkModelResult(videoId, videoModel, res.result.class_probability),
    ]
  },
  availability: "enabled",
}
const videoModel: ManipulationModelInfo = {
  type: "manipulation",
  mediaType: "video",
  manipulationCategory: "face",
  processor: videoProcessor,
  name: "Face Manipulation Detector",
  uncertainScore: 0.1,
  descrip:
    "Detects potential AI manipulation of faces present in images and " +
    "videos, as in the case of face swaps and face reenactment.",
  policy: "include",
}

const videoFaceRelevanceId = "sensity-video-faces"
const videoFaceRelevanceModel: RelevanceModelInfo = {
  type: "relevance",
  mediaType: "video",
  relevanceCategory: "faces",
  processor: videoProcessor,
}

const voiceId = "sensity-voice"
const voiceProcessor: Processor<VoiceApiResponse> = {
  id: voiceId,
  name: "Sensity.ai",
  mediaType: "audio",
  maxPending: 3,
  maxSize: 32 * 1024 * 1024,
  timeoutMs: 30 * 60 * 1000, // 30 minutes
  check: (res) => (res.error ? res.error : res.status == "failed" ? "Analysis failed." : undefined),
  adapt: (res) => [
    res.result.class_name == "real"
      ? mkResult(voiceId, "low", 1 - res.result.class_probability)
      : mkModelResult(voiceId, voiceModel, res.result.class_probability),
  ],
  availability: "archived",
}
const voiceModel: ManipulationModelInfo = {
  type: "manipulation",
  mediaType: "audio",
  manipulationCategory: "audio",
  processor: voiceProcessor,
  name: "Voice Analysis",
  uncertainScore: 0.1,
  descrip: "Detects AI-generated voices and voice cloning in audio.",
  policy: "ignore", // TEMP: temporarily disabled until they fix their stuff
}

export const manipulationModels = {
  [imageId]: imageModel,
  [videoId]: videoModel,
  [voiceId]: voiceModel,
}

export const relevanceModels = {
  [videoFaceRelevanceId]: videoFaceRelevanceModel,
}

export const processors = {
  [videoId]: videoProcessor,
  [imageId]: imageProcessor,
  [voiceId]: voiceProcessor,
}

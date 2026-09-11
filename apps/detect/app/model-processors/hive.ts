import { GeneratorPrediction, Generator, MIN_SCORE } from "../generators"
import {
  ModelResult,
  Face,
  Processor,
  mkResult,
  toRank,
  ManipulationModelInfo,
  RelevanceModelInfo,
  UNKNOWN_FACE,
  mkModelResult,
} from "../data/model"
import { HiveProcessorId } from "../api/starters/hive"
import { ModelId } from "./all"
import { pickHighestScoringOutput } from "./hive-util"

// Types that model Hive's API responses.
export type HiveApiResponse = {
  id: string
  code?: number
  error?: string
  project_id: number
  user_id?: number
  created_on?: string
  status: Status[]
  from_cache: boolean
}

export type Status = {
  status: { code: string; message: string }
  response: Response
}

export type Response = {
  input: Input
  output: Output[]
}

export type HiveMedia = {
  url: string | null
  filename: string | null
  type: string
  mime_type: string
  mimetype: string
  width: number
  height: number
  num_frames: number
  duration: number
}

export type Input = {
  model: string
  model_version: number
  model_type: string
  hash?: string
  media: HiveMedia
  id: string
  created_on: string
  user_id: number
  project_id: number
  charge: number
}

function mapGenerator(candidate: HiveClass): Generator | undefined {
  // The candidate generators that hive can identify, from https://docs.thehive.ai/reference/ai-generated-image-and-video-detection-1
  // mapped to our global generator names
  switch (candidate) {
    case "dalle":
      return "dalle"
    case "midjourney":
      return "midjourney"
    // Group all these stable diffusion ones together
    case "stablediffusion":
    case "stablediffusionxl":
    case "stablediffusioninpaint":
    case "sdxlinpaint":
      return "stablediffusion"
    case "hive":
      return "hive"
    case "bingimagecreator":
      return "bingimagecreator"
    case "gan":
      return "gan"
    case "adobefirefly":
      return "adobefirefly"
    case "kandinsky":
      return "kandinsky"
    case "lcm":
      return "lcm"
    case "pixart":
      return "pixart"
    case "glide":
      return "glide"
    case "imagen":
      return "imagen"
    case "amused":
      return "amused"
    case "stablecascade":
      return "stablecascade"
    case "deepfloyd":
      return "deepfloyd"
    case "vqdiffusion":
      return "vqdiffusion"
    case "wuerstchen":
      return "wuerstchen"
    case "titan":
      return "titan"
    case "sora":
      return "sora"
    case "pika":
      return "pika"
    case "harper":
      return "harper"
    default:
      return undefined
  }
}

export type HiveClass =
  | "no_deepfake"
  | "yes_deepfake"
  | "deepfake"
  | "ai_generated"
  | "not_ai_generated"
  | "none"
  | "adobefirefly"
  | "amused"
  | "bingimagecreator"
  | "dalle"
  | "deepfloyd"
  | "gan"
  | "glide"
  | "harper"
  | "hive"
  | "imagen"
  | "kandinsky"
  | "lcm"
  | "midjourney"
  | "pika"
  | "pixart"
  | "sora"
  | "stablediffusion"
  | "stablediffusionxl"
  | "stablediffusioninpaint"
  | "stablecascade"
  | "sdxlinpaint"
  | "titan"
  | "vqdiffusion"
  | "wuerstchen"

export type ClassScore = {
  // for deepfake: no_deepfake, yes_deepfake, deepfake
  // for aigen: ai_generated, not_ai_generated, none, dalle, midjourney, stablediffusion, hive,
  // bingimagecreator, gan, adobefirefly, kandinsky, stablediffusionx1
  class: HiveClass
  score: number
}

export type Output = {
  time: number
  bounding_poly?: BoundingPoly[] // used by deepfake results
  classes?: ClassScore[] // used by aigen results, along with deepfake results in the new HIVE_IMGVID_MULTI_API_KEY model
}

export type BoundingPoly = {
  vertices: { x: number; y: number }[]
  dimensions: { top: number; bottom: number; left: number; right: number }
  classes: ClassScore[]
  meta: {
    type: string
    score?: number
    id?: string
  }
}

function polyToFace(poly: BoundingPoly): Face {
  let mostFake = 0
  let leastReal = 1 // look for the "fakest" face we found
  let score = 0
  for (const cc of poly.classes) {
    switch (cc.class) {
      case "no_deepfake":
        if (leastReal > cc.score) {
          leastReal = cc.score
          // if we have none that were fake, our result will be the least real
          if (mostFake == 0) {
            score = 1 - cc.score
          }
        }
        break
      case "yes_deepfake":
        if (cc.score >= 0.01 && mostFake < cc.score) {
          mostFake = cc.score
          score = cc.score
        }
        break
      default:
        console.log(`Hive: Unknown poly class: '${cc.class}'`)
        break
    }
  }
  const { left, top, right, bottom } = poly.dimensions
  return {
    bounds: [left, top, right - left, bottom - top],
    score,
  }
}

export function getGeneratorPrediction(response: Response): GeneratorPrediction | undefined {
  try {
    const generatorPredictions = response.output
      .flatMap((oo) => oo.classes)
      .flatMap((cs) => {
        if (!cs) return []
        const maybeGenerator = mapGenerator(cs.class)
        return maybeGenerator ? [{ generator: maybeGenerator, score: cs.score }] : []
      })
      // sort by score so we only take the highest scoring generator
      .sort((a, b) => b.score - a.score)

    // only report a generator if the confidence is 0.5 or above
    if (generatorPredictions.length > 0 && generatorPredictions[0].score >= MIN_SCORE) {
      return generatorPredictions[0]
    }
  } catch (error) {
    console.log(`Failed to parse generator prediction from response:\n${JSON.stringify(response)}`, error)
  }

  return undefined
}

function pickFacemapResult(rsp: HiveApiResponse, modelId: ModelId): ModelResult[] {
  let maxFaces = 0
  const res = mkResult(modelId, "n/a", 0)
  for (const status of rsp.status) {
    if (status.status.message !== "SUCCESS" && !Array.isArray(status.response.output)) {
      console.log("Hive: Skipping invalid or non-success status", status.status)
      continue
    }

    res.generator = getGeneratorPrediction(status.response)

    // TEMP: don't save our frames to the ModelResult; we're not displaying them right now or doing anything with them,
    // and Hive returns a bunch of data for every single second of videos, so this could become quite massive; *if*
    // we end up doing anything with face bounding boxes, we will almost certainly want to pare this data down to some
    // manageable level and not save and pass around hundreds of verbose faces entries for every video we analyze
    const frames = /* res.frames =  */ status.response.output.map((oo) => ({
      time: oo.time,
      faces: oo.bounding_poly?.map(polyToFace),
    }))

    // classify each frame as positive/negative based on whether it has a face that is >= 0.5
    let maxScore = 0,
      posFrames = 0,
      consecPosFrames = 0,
      maxConsecPosFrames = 0,
      faces = 0,
      maxFrameFaces = 0
    for (const frame of frames) {
      if (!frame.faces) continue
      const frameScore = frame.faces.reduce((s, f) => Math.max(s, f.score), 0)
      faces += frame.faces.length
      maxScore = Math.max(frameScore, maxScore)
      const framePos = frameScore >= 0.5
      if (framePos) {
        posFrames += 1
        consecPosFrames += 1
        maxConsecPosFrames = Math.max(consecPosFrames, maxConsecPosFrames)
      } else {
        consecPosFrames = 0
      }
      maxFrameFaces = Math.max(maxFrameFaces, frame.faces.length)
    }

    // if we have two consecutive positive frames, or >= 10% of frames are positive: it is "high"
    if (maxConsecPosFrames >= 2 || posFrames >= frames.length / 10) {
      res.rank = "high"
      res.score = maxScore
    }
    // if it has any frames that are positive: it is "uncertain"
    else if (posFrames > 0) {
      res.rank = "uncertain"
      // cap the scores so that this does not register as a "definitely fake" result in our eval even if it had one or
      // more frames that were ranked as highly fake
      res.score = Math.min(0.49, maxScore)
    }
    // otherwise it is "low"
    else if (faces > 0) {
      res.rank = "low"
      res.score = maxScore // guaranteed to be < 0.5
    }

    maxFaces = Math.max(maxFaces, maxFrameFaces)
  }

  if (modelId === videoFacemapId) {
    // Someday, we could put face locations/frames into the result if needed for
    // refining the relevance. For now, we flatten all the frames into one representing
    // the frame with the max number of faces (postive and negative).
    const faces = [...Array(maxFaces)].map(() => UNKNOWN_FACE)
    const faceRelevance = mkModelResult(videoFaceRelevanceId, videoFaceRelevanceModel, 0, { faces })
    return [faceRelevance, res]
  } else {
    // TODO: we could use the result to create a face relevance model for images, as well
    return [res]
  }
}

function pickHiveResult({
  rsp,
  pickClass,
  modelId,
  model,
}: {
  rsp: HiveApiResponse
  pickClass: HiveClass
  modelId: ModelId
  model: ManipulationModelInfo
}) {
  const res = mkResult(modelId, "n/a", 0)
  const output = pickHighestScoringOutput(rsp, pickClass)
  if (output) {
    const { outputEntry } = output
    const foundClass = outputEntry.classes?.find((c) => c.class === pickClass)
    if (foundClass) {
      res.rank = toRank(model, foundClass.score)
      res.score = foundClass.score
    }
  }

  for (const status of rsp.status) {
    if (status.status.message !== "SUCCESS" || !Array.isArray(status.response.output)) {
      console.log("Hive: Skipping invalid or non-success status", status.status)
      continue
    }

    if (pickClass == "ai_generated") {
      res.generator = getGeneratorPrediction(status.response)
    }
  }

  return res
}

function pickAudioResult(rsp: HiveApiResponse) {
  const res = mkResult(audioId, "n/a", 0)
  for (const status of rsp.status) {
    if (status.status.message !== "SUCCESS" || !Array.isArray(status.response.output)) {
      console.log("Hive: Skipping invalid or non-success status", status.status)
      res.rank = "unknown"
      continue
    }

    res.generator = getGeneratorPrediction(status.response)

    for (const output of status.response.output) {
      // use the most fake result as our overall classification
      for (const cs of output.classes ?? []) {
        if (cs.class === "ai_generated" && cs.score > res.score) {
          res.rank = toRank(audioModel, cs.score)
          res.score = cs.score
        }
      }
    }
  }
  return res
}

const videoFacemapId = "hive-video" //"hive-video-facemap"
export const videoFacemapProcessor: Processor<HiveApiResponse> = {
  id: videoFacemapId,
  name: "Hive.ai",
  mediaType: "video",
  maxPending: 0, // handled by scheduler
  maxDuration: 90,
  check: (res) => res.error,
  adapt: (res) => pickFacemapResult(res, videoFacemapId),
  availability: "archived",
}
const videoFacemapModel: ManipulationModelInfo = {
  type: "manipulation",
  mediaType: "video",
  manipulationCategory: "face",
  processor: videoFacemapProcessor,
  name: "Deepfake Face Detector",
  descrip: "Uses a visual detection model to detect faces and check to see if they are deepfakes.",
  policy: "ignore",
}

const videoFaceRelevanceId = "hive-video-faces"
const videoFaceRelevanceModel: RelevanceModelInfo = {
  type: "relevance",
  mediaType: "video",
  relevanceCategory: "faces",
  processor: videoFacemapProcessor,
}

const imageGenAiId = "hive-image" //"hive-image-genai"
export const imageGenAiProcessor: Processor<HiveApiResponse> = {
  id: imageGenAiId,
  name: "Hive.ai",
  mediaType: "image",
  maxPending: 0, // handled by scheduler
  check: (res) => res.error,
  adapt: (res) => [
    pickHiveResult({
      rsp: res,
      pickClass: "ai_generated",
      modelId: imageGenAiId,
      model: manipulationModels[imageGenAiId],
    }),
  ],
  availability: "archived",
}
const imageGenAiModel: ManipulationModelInfo = {
  type: "manipulation",
  mediaType: "image",
  manipulationCategory: "imagen",
  processor: imageGenAiProcessor,
  name: "AI-Generated Image Detector",
  descrip:
    "Detects whether images are entirely AI-generated. Uses a model trained on a large dataset composed of millions of  " +
    "human and artificially generated items sourced from across the web such as photographs, digital and traditional art, and memes.",
  policy: "ignore",
}

const imageMultiProcId = "hive-image-multi"
export const imageMultiProcessor: Processor<HiveApiResponse> = {
  id: imageMultiProcId,
  name: "Hive.ai",
  mediaType: "image",
  maxPending: 0, // handled by scheduler
  check: (res) => res.error,
  adapt: (res) => [
    pickHiveResult({
      rsp: res,
      pickClass: "ai_generated",
      modelId: imageGenAiV2Id,
      model: manipulationModels[imageGenAiV2Id],
    }),
    pickHiveResult({
      rsp: res,
      pickClass: "deepfake",
      modelId: imageFacemapV2Id,
      model: manipulationModels[imageFacemapV2Id],
    }),
  ],
  availability: "disabled",
}
const imageGenAiV2Id = "hive-image-genai-v2"
const imageGenAiV2Model: ManipulationModelInfo = {
  type: "manipulation",
  mediaType: "image",
  manipulationCategory: "imagen",
  processor: imageMultiProcessor,
  name: "AI-Generated Image Detector",
  descrip:
    "Detects whether images are entirely AI-generated. Uses a model trained on a large dataset composed of millions of  " +
    "human and artificially generated items sourced from across the web such as photographs, digital and traditional art, and memes.",
  policy: "ignore",
}
const imageFacemapV2Id = "hive-image-facemap-v2"
const imageFacemapV2Model: ManipulationModelInfo = {
  type: "manipulation",
  mediaType: "image",
  manipulationCategory: "face",
  processor: imageMultiProcessor,
  name: "Deepfake Face Detector",
  descrip: "Uses a visual detection model to detect faces and check to see if they are deepfakes.",
  policy: "ignore",
}

const videoMultiProcId = "hive-video-multi"
export const videoMultiProcessor: Processor<HiveApiResponse> = {
  id: videoMultiProcId,
  name: "Hive.ai",
  mediaType: "video",
  maxPending: 0, // handled by scheduler
  check: (res) => res.error,
  adapt: (res) => [
    pickHiveResult({
      rsp: res,
      pickClass: "ai_generated",
      modelId: videoGenAiV2Id,
      model: manipulationModels[videoGenAiV2Id],
    }),
    pickHiveResult({
      rsp: res,
      pickClass: "deepfake",
      modelId: videoFacemapV2Id,
      model: manipulationModels[videoFacemapV2Id],
    }),
  ],
  availability: "disabled",
}
const videoGenAiV2Id = "hive-video-genai-v2"
const videoGenAiV2Model: ManipulationModelInfo = {
  type: "manipulation",
  mediaType: "video",
  manipulationCategory: "imagen", // TODO: category for AI generated video?
  processor: videoMultiProcessor,
  name: "AI-Generated Video Detector",
  descrip:
    "Detects whether videos are entirely AI-generated. Uses a model trained on a large dataset composed of millions of  " +
    "human and artificially generated items sourced from across the web such as photographs, digital and traditional art, and memes.",
  policy: "ignore",
}
const videoFacemapV2Id = "hive-video-facemap-v2"
const videoFacemapV2Model: ManipulationModelInfo = {
  type: "manipulation",
  mediaType: "video",
  manipulationCategory: "face",
  processor: videoMultiProcessor,
  name: "Deepfake Face Detector",
  descrip: "Uses a visual detection model to detect faces and check to see if they are deepfakes.",
  policy: "ignore",
}

const audioId = "hive-audio"
export const audioProcessor: Processor<HiveApiResponse> = {
  id: audioId,
  name: "Hive.ai",
  mediaType: "audio",
  maxPending: 0, // handled by scheduler
  check: (res) => res.error,
  adapt: (res) => [pickAudioResult(res)],
  availability: "enabled",
}
const audioModel: ManipulationModelInfo = {
  type: "manipulation",
  mediaType: "audio",
  manipulationCategory: "audio",
  processor: audioProcessor,
  name: "AI-Generated Audio Detector",
  descrip: "Detects AI-generated audio.",
  policy: "trust",
  trackPolicy: "include",
}

export const manipulationModels = {
  [videoFacemapId]: videoFacemapModel,
  [imageGenAiId]: imageGenAiModel,
  [imageGenAiV2Id]: imageGenAiV2Model,
  [imageFacemapV2Id]: imageFacemapV2Model,
  [videoFacemapV2Id]: videoFacemapV2Model,
  [videoGenAiV2Id]: videoGenAiV2Model,
  [audioId]: audioModel,
}

export const relevanceModels = {
  [videoFaceRelevanceId]: videoFaceRelevanceModel,
}

export const processors: Record<HiveProcessorId, Processor<HiveApiResponse>> = {
  [videoFacemapId]: videoFacemapProcessor,
  [imageGenAiId]: imageGenAiProcessor,
  [imageMultiProcId]: imageMultiProcessor,
  [videoMultiProcId]: videoMultiProcessor,
  [audioId]: audioProcessor,
}

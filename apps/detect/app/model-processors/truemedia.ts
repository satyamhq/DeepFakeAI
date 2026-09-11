import { TrueMediaProcessorId } from "../api/starters/truemedia"
import { Processor, mkResult, mkModelResult, ModelInfo, Face, UNKNOWN_FACE } from "../data/model"

export const mkPayload = {
  genconvit: (url: string) => ({ file_path: url }),
  dire: (url: string) => ({ file_path: url }),
  ufd: (url: string) => ({ file_path: url }),
  buffalo: (url: string) => ({ url }),
  "reverse-search": (url: string) => ({ file_path: url }),
  styleflow: (url: string) => ({ file_path: url }),
  ftcn: (url: string) => ({ file_path: url }),
  faces: (url: string) => ({ file_path: url }),
}

export type ApiResponse = {
  df_probability: number
  prediction: "REAL" | "FAKE"
  error?: string
}

type ApiResponseWithNoFace = Omit<ApiResponse, "prediction"> & {
  prediction: "REAL" | "FAKE" | "NO_FACE"
}

function adapt(proc: Processor<ApiResponse>, model: ModelInfo, res: ApiResponse) {
  const score = res.df_probability
  // note that the processor.id is also the id for our internal models
  return [mkModelResult(proc.id, model, score)]
}

function adaptWithNoFace(proc: Processor<ApiResponseWithNoFace>, model: ModelInfo, res: ApiResponseWithNoFace) {
  if (res.prediction == "NO_FACE") return [mkResult(proc.id, "n/a", 0)]
  else return adapt(proc, model, res as ApiResponse)
}

const genconvit: Processor<ApiResponseWithNoFace> = {
  id: "genconvit",
  name: "genconvit",
  mediaType: "video",
  maxPending: 0,
  check: (res) => res.error,
  adapt: (res) => {
    // The `genconvit-faces` model is used to determine if faces are present or not.
    // If they are not present, then it is an "Experimental Result" designated in the UI.
    const faces = res.prediction == "NO_FACE" ? [] : [UNKNOWN_FACE]
    const faceRelevance = mkModelResult("genconvit-faces", models["genconvit-faces"], 0, { faces })

    // The `genconvit` model is used to determine fakeness of videos.
    return [faceRelevance, ...adaptWithNoFace(genconvit, models.genconvit, res as ApiResponse)]
  },
  availability: "enabled",
}

const dire: Processor<ApiResponse> = {
  id: "dire",
  name: "DIRE",
  mediaType: "image",
  maxPending: 0,
  check: (res) => res.error,
  adapt: (res) => adapt(dire, models.dire, res),
  availability: "archived",
}

const ufd: Processor<ApiResponse> = {
  id: "ufd",
  name: "Universal Fake Detector",
  mediaType: "image",
  maxPending: 0,
  check: (res) => res.error,
  adapt: (res) => adapt(ufd, models.ufd, res),
  availability: "archived",
}

type BuffaloApiResponse = {
  fake_probability: number
  label: string
  error?: string
}

const buffalo: Processor<BuffaloApiResponse> = {
  id: "buffalo",
  name: "University of Buffalo",
  mediaType: "audio",
  maxPending: 0,
  check: (res) => res.error,
  adapt: (res) => {
    const score = res.fake_probability
    return [mkModelResult("buffalo", models.buffalo, score)]
  },
  availability: "archived",
}

type ReverseSearchApiResponse = {
  score: number
  sourceUrl: string
  rationale: string
  error?: string
}

const reverseSearch: Processor<ReverseSearchApiResponse> = {
  id: "reverse-search",
  name: "Reverse Search Analysis",
  mediaType: "image",
  maxPending: 0,
  check: (res) => res.error,
  adapt: (res) => {
    const { score, sourceUrl, rationale } = res
    // TEMP: workaround JSON results that supply "Unknown" for score
    if (typeof score !== "number" || score < 0) {
      return [mkResult("reverse-search", "n/a", 0)]
    }
    return [mkModelResult("reverse-search", models["reverse-search"], score, { rationale, sourceUrl })]
  },
  availability: "archived",
}

const styleflow: Processor<ApiResponse> = {
  id: "styleflow",
  name: "Style Latent Flows Analysis",
  mediaType: "video",
  maxPending: 0,
  check: (res) => res.error,
  adapt: (res) => adapt(styleflow, models.styleflow, res),
  availability: "archived",
}

const ftcn: Processor<ApiResponseWithNoFace> = {
  id: "ftcn",
  name: "FTCN",
  mediaType: "video",
  maxPending: 0,
  check: (res) => res.error,
  adapt: (res) => adaptWithNoFace(ftcn, models.ftcn, res),
  availability: "archived",
}

type ApiFace = {
  left: number
  top: number
  right: number
  bottom: number
  confidence: number
}

type FacesApiResponse = {
  faces: ApiFace[]
  error?: string
}

const faces: Processor<FacesApiResponse> = {
  id: "faces",
  name: "Face Detector",
  mediaType: "image",
  maxPending: 0,
  check: (res) => res.error,
  adapt: (res) => {
    const faces = res.faces.map(
      (apiFace) =>
        ({
          bounds: [apiFace.left, apiFace.top, apiFace.right - apiFace.left, apiFace.bottom - apiFace.top],
          score: apiFace.confidence,
        }) as Face,
    )
    return [mkModelResult("faces", models.faces, 0, { faces })]
  },
  availability: "archived",
}

const models: Record<string, ModelInfo> = {
  genconvit: {
    type: "manipulation",
    mediaType: "video",
    manipulationCategory: "face",
    processor: genconvit,
    name: "Video Facial Analysis",
    descrip: "Analyzes video frames for unusual patterns and discrepancies in facial features.",
    uncertainScore: 0.4,
    fakeScore: 0.5,
    policy: "ignore",
  },
  dire: {
    type: "manipulation",
    mediaType: "image",
    manipulationCategory: "noise",
    processor: dire,
    name: "Diffusion-Generated Image Detector",
    descrip: "Identifies visual noise left behind by a diffusion model while it generates an image.",
    policy: "ignore",
  },
  ufd: {
    type: "manipulation",
    mediaType: "image",
    manipulationCategory: "imagen",
    processor: ufd,
    name: "Universal Fake Detector Analysis",
    fakeScore: 0.5,
    descrip:
      "Analyzes images to determine if they’re generated by a variety " +
      "of autoregressive or other popularly used types of generative models.",
    policy: "ignore",
  },
  buffalo: {
    type: "manipulation",
    mediaType: "audio",
    manipulationCategory: "audio",
    processor: buffalo,
    name: "Audio Analysis",
    descrip: "Analyzes audio for evidence that it was created by an AI generator or cloning.",
    policy: "ignore",
    trackPolicy: "ignore",
  },
  "reverse-search": {
    type: "manipulation",
    mediaType: "image",
    manipulationCategory: "imagen",
    processor: reverseSearch,
    name: "Reverse Search Analysis",
    descrip:
      "Uses reverse image search to obtain a source URL to analyze whether an image was generated by AI or otherwise digitally manipulated.",
    policy: "ignore",
    hideScore: true,
  },
  styleflow: {
    type: "manipulation",
    mediaType: "video",
    manipulationCategory: "face",
    fakeScore: 0.5,
    processor: styleflow,
    name: "Style Latent Flows Analysis",
    descrip: "Detects manipulated videos by analyzing changes in facial movements and expressions.",
    policy: "ignore",
  },
  ftcn: {
    type: "manipulation",
    mediaType: "video",
    manipulationCategory: "face",
    processor: ftcn,
    name: "Facial Temporal Analysis",
    descrip: "Analyzes videos for inconsistencies in facial appearance over time to detect possible AI manipulation.",
    policy: "ignore",
  },
  faces: {
    type: "relevance",
    mediaType: "image",
    relevanceCategory: "faces",
    processor: faces,
  },
  "genconvit-faces": {
    type: "relevance",
    mediaType: "video",
    relevanceCategory: "faces",
    processor: genconvit,
  },
}

function filterModels(modelToFilter: Record<string, ModelInfo>, predicate: (value: ModelInfo) => boolean) {
  return Object.fromEntries(Object.entries(modelToFilter).filter(([, value]) => predicate(value)))
}

export const manipulationModels = filterModels(models, (modelInfo) => modelInfo.type === "manipulation")
export const relevanceModels = filterModels(models, (modelInfo) => modelInfo.type === "relevance")

export const processors: Record<TrueMediaProcessorId, Processor<any>> = {
  genconvit,
  dire,
  ufd,
  buffalo,
  "reverse-search": reverseSearch,
  styleflow,
  ftcn,
  faces,
}

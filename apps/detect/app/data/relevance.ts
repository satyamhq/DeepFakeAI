import { ModelId, models } from "../model-processors/all"
import { Face, ModelResult, RelevanceCategory, relevanceCategories } from "./model"
import { MediaType } from "./media"
import { ExperimentalReason, computeVoteVerdict, modelsUnready } from "./verdict"
import { missingCaseError } from "../utils/missingCaseErrror"

const modelsForCategoryUnready = (pending: string[], relevanceCategory: RelevanceCategory) =>
  modelsUnready(pending, (modelId) => {
    const model = models[modelId]
    return model.type === "relevance" && model.relevanceCategory === relevanceCategory
  })

function isRelevanceApplicable(type: MediaType, results: ModelResult[]) {
  if (type !== "video") return true

  // If this is a video and we reach a fake verdict purely on audio alone,
  // we ignore the video relevance data.
  const audioResults = results.filter((mr) => {
    const model = models[mr.modelId as ModelId]
    return !!model && model.type === "manipulation" && model.mediaType === "audio"
  })
  return computeVoteVerdict(type, audioResults) !== "high"
}

function countConfidentFaces(faces: Face[] | undefined) {
  if (!faces) return 0
  return faces.filter((face) => face.score >= 0.5).length
}

/* Our manipulation models are tuned to work best on certain kinds of media.
  So we examine the media to see if it is relevant to our manipulation models. */
export function determineRelevance(type: MediaType, results: ModelResult[], pending: string[]) {
  if (!isRelevanceApplicable(type, results)) {
    return { isRelevanceDecided: true, experimentalReasons: [] }
  }

  const isDecided: Partial<Record<RelevanceCategory, boolean>> = {}
  const experimentalReasons: ExperimentalReason[] = []

  relevanceCategories.forEach((category: RelevanceCategory) => {
    const resultsForCategory = results.filter((result) => {
      const model = models[result.modelId]
      return model.type === "relevance" && model.mediaType === type && model.relevanceCategory === category
    })

    let reason: ExperimentalReason | undefined
    switch (category) {
      case "faces": {
        const faceCounts = resultsForCategory.map((result) => countConfidentFaces(result.faces))
        const noFaceResults = faceCounts.filter((count) => count === 0)
        const tooManyFaceResults = faceCounts.filter((count) => count >= 5)
        const voteThreshold = Math.ceil(resultsForCategory.length / 2)
        // A majority of the models have to agree with the experimental outcome
        if (noFaceResults.length !== 0 && noFaceResults.length >= voteThreshold) {
          reason = "faces-too-few"
        } else if (type === "image" && tooManyFaceResults.length !== 0 && tooManyFaceResults.length >= voteThreshold) {
          // Right now, we only look for too many faces in images. Video would need a more complex
          // heuristic that only considers "significant" faces of a big enough size, since a frame
          // with a crowd could alter the result of a video primarily focused on a single person.
          reason = "faces-too-many"
        }
        break
      }
      case "artwork":
      case "text":
        if (resultsForCategory.find((result) => result.score === 1)) {
          reason = category
        }
        break
      default:
        throw missingCaseError(category)
    }

    const unreadyCount = modelsForCategoryUnready(pending, category).length
    isDecided[category] = !!reason || unreadyCount === 0
    if (reason) experimentalReasons.push(reason)
  })

  // If any category is decided to be experimental, OR everything is decided,
  // then overall relevance is decided. More results may arrive and add to
  // experimentalReasons even after relevance is decided.
  const isRelevanceDecided =
    experimentalReasons.length > 0 || relevanceCategories.every((category) => isDecided[category])

  return { isRelevanceDecided, experimentalReasons }
}

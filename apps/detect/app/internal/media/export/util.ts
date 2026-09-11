import { isArchived } from "../../../model-processors/all"
import { MediaSummary } from "../../summarize"

export function sortScoresColumnHeaders(msums: MediaSummary[]) {
  const columnHeaders = new Set<string>()
  msums.forEach((msum) => {
    const scoreModelIds = Object.keys(msum.scores)
    scoreModelIds.forEach((modelId) => {
      if (!isArchived(modelId)) {
        columnHeaders.add(modelId)
      }
    })
  })
  const sortedColumnHeaders = Array.from(columnHeaders).sort()
  return sortedColumnHeaders
}

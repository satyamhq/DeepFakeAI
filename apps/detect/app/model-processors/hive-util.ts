import { HiveApiResponse, HiveClass, Output, Status } from "./hive"

/* Hive returns ridiculously long payloads for videos, with data for every frame of the
  video. Rather than store everything, we prune to store only the highest scoring frames. */
export function pruneToHighestScoringOutput(response: HiveApiResponse): HiveApiResponse {
  // Only keep the outputs that have the highest scoring aigen and deepfake entries
  const pickClasses = ["ai_generated", "deepfake"] as HiveClass[]
  return pickHighestScoringOutputs(response, pickClasses)
}

export function pickHighestScoringOutputs(response: HiveApiResponse, pickClasses: HiveClass[]): HiveApiResponse {
  // Find the output entry with the highest score for each pickClass
  const highestScoringEntries: { status: Status; outputEntry: Output }[] = []
  for (const pickClass of pickClasses) {
    const bestEntry = pickHighestScoringOutput(response, pickClass)

    // Detect duplicates
    if (
      bestEntry &&
      !highestScoringEntries.find(
        (existing) => existing.status === bestEntry.status && existing.outputEntry === bestEntry.outputEntry,
      )
    ) {
      highestScoringEntries.push(bestEntry)
    }
  }

  if (highestScoringEntries.length === 0) {
    return response
  }

  // Group entries by status to maintain original structure
  const entriesByStatus = new Map<Status, Output[]>()
  for (const entry of highestScoringEntries) {
    const existingOutputs = entriesByStatus.get(entry.status) || []
    entriesByStatus.set(entry.status, [entry.outputEntry, ...existingOutputs])
  }

  // Create a new response with the highest-scoring outputs
  const prunedResponse: HiveApiResponse = {
    ...response,
    status: Array.from(entriesByStatus.entries()).map(([status, outputs]) => ({
      ...status,
      response: {
        ...status.response,
        output: outputs,
      },
    })),
  }

  return prunedResponse
}

type OutputEntry = { status: Status; outputEntry: Output }
export function pickHighestScoringOutput(response: HiveApiResponse, pickClass: HiveClass): OutputEntry | null {
  if (!response.status) return null

  // Get all successful status entries
  const successfulStatuses = response.status.filter((status) => status.status.message === "SUCCESS")

  // Find the output entry with the highest score for the pickClass
  let highestScore = -1
  let bestEntry: OutputEntry | null = null

  for (const status of successfulStatuses) {
    for (const outputEntry of status.response.output) {
      const foundClass = outputEntry.classes?.find((c) => c.class === pickClass)
      if (foundClass && foundClass.score > highestScore) {
        highestScore = foundClass.score
        bestEntry = {
          status,
          outputEntry,
        }
      }
    }
  }

  return bestEntry
}

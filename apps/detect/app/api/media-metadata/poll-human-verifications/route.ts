import { GroundTruthUpdate } from "@prisma/client"
import { db } from "../../../server"
import { response } from "../../util"
import { notifyUsersGroundTruthUpdate } from "../actions"

export const dynamic = "force-dynamic"

async function resolveUpdates(mediaId: string, updates: GroundTruthUpdate[]) {
  if (updates.length < 1) return
  const first = updates[0]
  const last = updates[updates.length - 1]

  // A poll count of 5 represents this item being in the queue for five minutes.
  if (last.pollCount > 5) {
    try {
      // Only email the person if the ground truth label actually changed overall
      if (first.oldSummary !== last.newSummary) {
        await notifyUsersGroundTruthUpdate(mediaId, last.newSummary)
      } else {
        console.log(
          `GroundTruthUpdate resolveUpdates verdict ultimately did not change [mediaId=${mediaId}, oldSummary=${first.oldSummary}, newSummary=${last.newSummary}}]`,
        )
      }
      // Whether the ground truth label changed or not we should clear out all these updates
      // since they've all been here at least five times.
      await db.groundTruthUpdate.deleteMany({ where: { mediaId } })
      console.log(
        `GroundTruthUpdate resolveUpdates clearing queue [mediaId=${mediaId}, deletedCount=${updates.length}]`,
      )
    } catch (e) {
      console.error("GroundTruthUpdate resolveUpdate", e)
    }
  }
}

export async function GET() {
  const allUpdates = await db.groundTruthUpdate.findMany({ orderBy: { createdAt: "asc" } })
  const mediaIdToUpdates: Record<string, GroundTruthUpdate[]> = {}
  await Promise.all(
    allUpdates.map(async (update) => {
      try {
        await db.groundTruthUpdate.update({
          where: { id: update.id },
          data: { pollCount: update.pollCount + 1 },
        })
      } catch (e) {
        console.warn("GroundTruthUpdate error updating", update)
      }
      if (!mediaIdToUpdates[update.mediaId]) mediaIdToUpdates[update.mediaId] = []
      mediaIdToUpdates[update.mediaId].push(update)
    }),
  )

  const updateLog = allUpdates
    .map(
      (update) =>
        `[count=${update.pollCount}, old=${update.oldSummary}, new=${update.newSummary}, id=${update.mediaId}]`,
    )
    .join("\n")
  if (allUpdates.length > 0) {
    console.log(`GroundTruthUpdate poll-human-verification\n${updateLog}`)
  }

  await Promise.all(
    Object.entries(mediaIdToUpdates).map(async ([mediaId, updates]) => await resolveUpdates(mediaId, updates)),
  )
  return response.make(200, { pending: allUpdates })
}

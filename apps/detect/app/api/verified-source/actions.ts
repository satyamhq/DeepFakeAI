import { VerifiedSource } from "@prisma/client"
import { idBasedPlatforms } from "../source"
import { db } from "../../server"

export async function updateVerifiedMediaAfterInsert(newSources: VerifiedSource[]) {
  const updated = []
  for (const source of newSources) {
    try {
      const added = await updateVerifiedMedia(true, source)
      updated.push(added)
    } catch (e) {
      console.error(e)
    }
  }
  console.info(`Updated ${updated.length} medias after inserting ${newSources.length} new verified source`)
  return updated
}

export async function updateVerifiedMediaAfterDelete(deleted: VerifiedSource) {
  const updated = await updateVerifiedMedia(false, deleted)
  console.info(
    `Updated ${updated.count} medias after deleting verified source [platform=${deleted.platform}, platformId=${deleted.platformId}, displayName=${deleted.displayName}]`,
  )
  return updated
}

async function updateVerifiedMedia(newValue: boolean, source: VerifiedSource) {
  const mediaColumn = idBasedPlatforms.includes(source.platform) ? "sourceUserId" : "sourceUserName"
  console.log("UPDATING", mediaColumn)
  const updated = await db.media.updateMany({
    data: {
      verifiedSource: newValue,
    },
    where: {
      source: source.platform,
      [mediaColumn]: source.platformId,
    },
  })
  return updated
}

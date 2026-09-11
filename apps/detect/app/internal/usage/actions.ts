import { clerkClient, User } from "@clerk/nextjs/server"
import { Media } from "@prisma/client"
import { db } from "../../server"
import { hasBeenReviewed } from "../../data/groundTruth"

export type Data = { postUrl: string; mediaId: string; time: Date; reviewed: boolean; reviewers: string[] }

const unattributedKey = "Unattributed"
const clerkListLimit = 100 // Clerk's UserList endpoint only accepts 100 external IDs, emails, etc. in each parameter field

// some temporary hackery needed to deal with old non-canonical URLs in query table
function cleanPostUrl(url: string) {
  if (url.includes("x.com")) url = url.replaceAll("x.com", "twitter.com")
  if (
    (url.includes("twitter.com") || url.includes("instagram.com") || url.includes("drive.google.com")) &&
    url.lastIndexOf("?") > 0
  )
    url = url.substring(0, url.lastIndexOf("?"))
  if (url.includes("twitter.com") && url.endsWith("/")) url = url.substring(0, url.length - 1)
  return url
}

/** Returns a mapping of Clerk User objects keyed by external (database) ID */
async function resolveUserIds(userIds: string[]) {
  const byExternalId = new Map<string, User>()
  // filter out any "Unattributed"s
  userIds = userIds.filter((id) => id !== unattributedKey)

  // We can only query so many IDs at a time, so perform multiple requests if needed
  while (userIds.length > 0) {
    const idBatch = userIds.slice(0, clerkListLimit)
    const clerkUsers = await clerkClient().users.getUserList({ externalId: idBatch })
    clerkUsers.data.forEach((u: User) => {
      // This should never not be the case, given we're looking up users by externalId
      if (u.externalId) {
        byExternalId.set(u.externalId, u)
      }
    })
    userIds = userIds.slice(clerkListLimit)
  }

  return byExternalId
}

/** Used to ignore media that was not itself analyzed but which served as the source from which a trimmed segment was
 * extracted and analyzed. If a source media _does_ end up getting analyzed, then we don't ignore it. This will ensure
 * that things keep working as expected if we decide to later add a feature where an already analyzed piece of media
 * can be trimmed and re-analyzed. */
const ignoreTrimmed = (media: Media) => media.trimmed && media.analysisTime == 0

export default async function getUserQueries(since: Date) {
  const media = await db.media.findMany({
    where: { resolvedAt: { gt: since } },
    include: { posts: true, meta: true },
  })

  const queries = await db.query.findMany({
    where: { time: { gt: since } },
    include: { user: true },
  })

  // Store a mapping of emails from the DB as a backup if Clerk lacks info (like in dev)
  const dbEmailsById = new Map<string, string>()

  // find the earliest person who made each query
  const earliest: Map<string, { id: string; time: Date }> = new Map()
  for (const qq of queries) {
    const postUrl = cleanPostUrl(qq.postUrl)
    const prev = earliest.get(postUrl)
    if (!prev || prev.time > qq.time) {
      dbEmailsById.set(qq.user.id, qq.user.email!)
      earliest.set(postUrl, { id: qq.user.id, time: qq.time })
    }
  }

  // now group the media by the user who made the earliest query that contains the media
  const byUserId: Map<string, Data[]> = new Map()

  function addPost(id: string, data: Data) {
    const posts = byUserId.get(id)
    if (posts) posts.push(data)
    else byUserId.set(id, [data])
  }

  for (const mm of media) {
    for (const pp of mm.posts) {
      const postUrl = cleanPostUrl(pp.postUrl)
      const user = earliest.get(postUrl)
      const reviewed = hasBeenReviewed(mm)
      const reviewers: string[] = [
        ...new Set([mm.meta?.fakeReviewer, mm.meta?.audioFakeReviewer].filter((r) => !!r).map((r) => r!.split("@")[0])),
      ]
      if (user) addPost(user.id, { postUrl, mediaId: mm.id, time: user.time, reviewed, reviewers })
      // If this media was the source from which a trimmed media was created and analyzed, we don't want to include it
      // here as an unattributed media. We know that it has no associated query record because it was intentionally
      // deleted and replaced with a query for the trimmed segment.
      else if (ignoreTrimmed(mm))
        addPost(unattributedKey, { postUrl, mediaId: mm.id, time: mm.resolvedAt, reviewed, reviewers })
    }
  }

  // Get the users we've seen from Clerk to get up-to-date emails
  const usersByExternalId = await resolveUserIds(Array.from(byUserId.keys()))

  const byUser = new Map<string, Data[]>()
  byUserId.forEach((value: Data[], key: string) => {
    // If we have an email from Clerk, use that. It'll be most up-to-date.
    const fromClerk = usersByExternalId.get(key)?.primaryEmailAddress?.emailAddress
    // If we have an email stored in the DB, it might be outdated, but it's better than nothing.
    const fromDb = dbEmailsById.get(key)
    // Fall back to ID so it can at least be attributed.
    byUser.set(fromClerk || fromDb || key, value)
  })

  return { media, byUser }
}

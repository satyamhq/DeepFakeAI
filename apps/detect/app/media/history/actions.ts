"use server"

import { revalidatePath } from "next/cache"
import { Prisma, Trulean } from "../../types/db"
import { db, getServerRole } from "../../server"
import { MediaSource } from "../../data/media"
import { Verdict, VerdictResult } from "../../data/verdict"
import { ModelResult } from "../../data/model"
import { buildHistoryParams, filterHistoryItem, getTallyScores, getUserQueries, initTallyScores } from "./actions-util"
import { isUserInAnyOrg } from "../../utils/clerk"
import { rootLogger } from "../../logging"

export type QueriesWithUser = Prisma.QueryGetPayload<{ include: { user: true } }>[]
export type PostMediaWithMeta = Prisma.PostMediaGetPayload<{ include: { media: { include: { meta: true } } } }>

export type UserHistoryQuery = {
  take: number
  filter: string
  query: string
  timeStart?: Date
  timeEnd?: Date
  sortOrder: "desc" | "asc"
  accuracy?: string
  userId: string | null
  orgId: string | null
  allOrg: boolean
  isImpersonating: boolean
}

export type UserQuery = {
  userEmail: string
  postUrl: string
  mediaId: string
  mimeType: string
  verdict: Verdict | "unresolved"
  verdicts: VerdictResult
  visualFake: Trulean
  audioFake: Trulean
  queriedAt?: Date
  analysisTime: number
  mediaSource: MediaSource
  resolvedResults: ModelResult[]
  comments: string
  keywords: string
  isFallback?: boolean
  score?: number
  confidence?: number
  sourcePlatform?: string
}

export async function deleteUserHistoryItemAction(mediaId: string, postUrl: string): Promise<{ success: boolean; error?: string }> {
  const role = await getServerRole()
  if (!role.isLoggedIn) {
    return { success: false, error: "Must be logged in to delete history." }
  }

  try {
    // Only delete queries belonging strictly to the authenticated user
    await db.query.deleteMany({
      where: {
        userId: role.id,
        postUrl,
      },
    })

    // If this user was the media creator/uploader, clean up related analysis and media records
    const media = await db.media.findUnique({ where: { id: mediaId } })
    if (media && (media as any).userId === role.id) {
      await db.analysisResult.deleteMany({ where: { mediaId } })
      await db.postMedia.deleteMany({ where: { mediaId } })
      try {
        await db.mediaMetadata.deleteMany({ where: { mediaId } })
      } catch {
        // Ignored
      }
      await db.media.delete({ where: { id: mediaId } })
    }

    revalidatePath("/media/history")
    revalidatePath("/")
    return { success: true }
  } catch (err: any) {
    console.error("Error deleting user history item:", err)
    return { success: false, error: err?.message || "Failed to delete history item." }
  }
}

export async function getUserHistory({
  take,
  filter,
  query,
  timeStart,
  timeEnd,
  sortOrder,
  userId,
  orgId,
  allOrg,
  accuracy,
  isImpersonating,
}: UserHistoryQuery) {
  const start = performance.now()

  let params
  try {
    params = await buildHistoryParams({ timeStart, timeEnd, userId, orgId, allOrg, isImpersonating })
  } catch {
    return { history: [], tallyScores: initTallyScores() }
  }

  // A user with an account not in an org should see zero results in the Org History view.
  // This should only happen for their own account. (There could be an admin
  // viewing other orgs via impersonation even though they're not in an org.)
  if (!isImpersonating && allOrg && !(await isUserInAnyOrg())) {
    console.warn("GetUserHistory User viewing org history is not in org. Returning zero results.", { userId, orgId })
    return { history: [], tallyScores: initTallyScores() }
  }

  const allQueries = await db.query.findMany({
    take,
    where: params,
    include: { user: true },
    orderBy: [{ time: sortOrder }],
  })

  const history = await getUserQueries(allQueries, orgId, allOrg)
  const tallyScores = getTallyScores(history)
  const filtered: UserQuery[] = history.filter((item) => filterHistoryItem({ item, query, filter, accuracy }))

  const dateAscending = (a: UserQuery, b: UserQuery) => (a.queriedAt?.getTime() ?? 0) - (b.queriedAt?.getTime() ?? 0)
  const dateDescending = (a: UserQuery, b: UserQuery) => (b.queriedAt?.getTime() ?? 0) - (a.queriedAt?.getTime() ?? 0)
  filtered.sort(sortOrder === "desc" ? dateDescending : dateAscending)

  const duration = performance.now() - start
  rootLogger.info({ event: "GetUserHistory", userId, orgId, isImpersonating, size: history.length, duration })

  return { history: filtered, tallyScores }
}

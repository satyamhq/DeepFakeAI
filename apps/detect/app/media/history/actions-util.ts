import { clerkClient } from "@clerk/nextjs/server"
import { Trulean } from "@prisma/client"
import { db, getServerRole } from "../../server"
import { PostMediaWithMeta, QueriesWithUser, UserQuery } from "./actions"
import { mediaVerdict, resolveResults, Verdict, VerdictResult } from "../../data/verdict"
import { determineSource, mediaType } from "../../data/media"
import { CachedResults } from "../../data/model"
import { ANONYMOUS_USER_ID } from "../../../instrumentation"
import { determineMediaFake, meansFake, meansHumanVerified } from "../../data/groundTruth"

export async function buildHistoryParams({
  timeStart,
  timeEnd,
  userId,
  orgId,
  allOrg,
  isImpersonating,
}: {
  timeStart?: Date
  timeEnd?: Date
  userId: string | null
  orgId: string | null
  allOrg: boolean
  isImpersonating: boolean
}) {
  const role = await getServerRole()

  // Fail on unauthorized impersonations.
  if (!role.internal && isImpersonating) {
    throw "Unauthorized"
  }

  const params = {
    time: { gt: timeStart, lt: timeEnd },
    userId: userId as string | undefined,
    orgId: orgId as string | undefined,
    isDeleted: false,
  }

  if (isImpersonating && userId === ANONYMOUS_USER_ID) {
    params.userId = ANONYMOUS_USER_ID
    params.orgId = undefined
    return params
  }

  if (isImpersonating && userId?.includes("@")) {
    try {
      const users = await clerkClient().users.getUserList({ emailAddress: [userId] })
      if (!users || users.data.length < 1) throw "No Clerk user"
      if (users.data.length > 1) throw "Multiple Clerk users"
      params.userId = users.data[0].id
      params.orgId = undefined
      return params
    } catch (e) {
      throw "Bad request"
    }
  }

  let externalId
  if (userId) {
    try {
      externalId = (await clerkClient().users.getUser(userId)).externalId
      if (!externalId) throw "No Clerk user"
    } catch (e) {
      throw "Bad request"
    }
  }

  if (orgId) {
    try {
      await clerkClient().organizations.getOrganization({ organizationId: orgId })
    } catch (e) {
      throw "Bad request"
    }
  }

  // Impersonate User
  if (isImpersonating && userId) {
    params.userId = externalId
    params.orgId = undefined
    return params
  }

  // Impersonate Org
  if (isImpersonating && orgId && allOrg) {
    params.userId = undefined
    params.orgId = orgId
    return params
  }

  // Org history
  if (orgId && allOrg) {
    params.userId = undefined
    params.orgId = orgId
    return params
  }

  // User history
  params.userId = externalId ?? undefined
  params.orgId = orgId ?? undefined
  return params
}

export function initTallyScores() {
  const tallyScores: Record<string, number> = {
    high: 0,
    uncertain: 0,
    low: 0,
    unresolved: 0,
    all: 0,

    truePositives: 0,
    trueNegatives: 0,
    falsePositives: 0,
    falseNegatives: 0,
    totalGroundTruths: 0,
  }
  return tallyScores
}

export async function buildExternalIdToEmail(orgId: string | undefined | null) {
  // Look up every member in the org, and then look up the users by their IDs in order to access .externalId
  const externalIdToEmail: Record<string, string> = {}
  if (orgId) {
    try {
      const members = await clerkClient().organizations.getOrganizationMembershipList({
        organizationId: orgId,
        limit: 500,
      })
      const userIds = members.data.flatMap((mm) => mm.publicUserData?.userId ?? [])
      const users = await clerkClient().users.getUserList({ userId: userIds, limit: 500 })
      for (const user of users.data) {
        if (user.externalId && user.primaryEmailAddress?.emailAddress) {
          externalIdToEmail[user.externalId] = user.primaryEmailAddress?.emailAddress
        }
      }
    } catch (e) {
      console.error(`GetUserHistory Error buildExternalIdToEmail [orgId=${orgId}]`, e)
    }
  }
  return externalIdToEmail
}

export function dedupeQueries(allQueries: QueriesWithUser) {
  const { queries } = allQueries.reduce(
    ({ queries, seen }: { queries: typeof allQueries; seen: Set<string> }, current) => {
      // Gather queries with unique postUrl. My own dev environment had duplicate
      // queries. Perhaps other early users will have duplicates as well.
      if (!seen.has(current.postUrl)) {
        queries.push(current)
        seen.add(current.postUrl)
      }
      return { queries, seen }
    },
    { queries: [], seen: new Set<string>() },
  )
  return queries
}

export async function buildLookupTables(orgId: string | undefined | null, allOrg: boolean, queries: QueriesWithUser) {
  const externalIdToEmail = await buildExternalIdToEmail(orgId)
  const postUrlToClerkEmail: Record<string, string> = {}
  const postUrls = queries.map((qq) => {
    postUrlToClerkEmail[qq.postUrl] = !allOrg || !orgId ? "" : externalIdToEmail[qq.user.id] ?? "Former member"
    return qq.postUrl
  })
  const postUrlToQueriedAt = new Map(queries.map((query) => [query.postUrl, query.time]))
  const postMedias = await db.postMedia.findMany({
    where: { postUrl: { in: postUrls } },
    include: { media: { include: { meta: true } } },
  })

  // Create a lookup table to lookup a list of all Media associated with each post url
  const postUrlToPostMedia = postMedias.reduce((all: Record<string, PostMediaWithMeta[]>, postMedia) => {
    if (!all[postMedia.postUrl]) {
      all[postMedia.postUrl] = []
    }
    all[postMedia.postUrl].push(postMedia)
    return all
  }, {})

  return { postUrlToPostMedia, postUrlToClerkEmail, postUrlToQueriedAt }
}

export function postMediaToUserQuery(
  postMedia: PostMediaWithMeta,
  postUrlToClerkEmail: Record<string, string>,
  postUrlToQueriedAt: Map<string, Date>,
): UserQuery {
  return {
    userEmail: postUrlToClerkEmail[postMedia.postUrl] ?? "",
    postUrl: postMedia.postUrl,
    mediaId: postMedia.mediaId,
    mimeType: postMedia.media.mimeType,
    visualFake: postMedia.media.meta?.fake || "UNKNOWN",
    audioFake: postMedia.media.meta?.audioFake || "UNKNOWN",
    verdict: getVerdict(postMedia),
    verdicts: mediaVerdict(postMedia.media),
    queriedAt: postUrlToQueriedAt.get(postMedia.postUrl),
    analysisTime: postMedia.media.analysisTime,
    mediaSource: determineSource(postMedia.media),
    resolvedResults: resolveResults(mediaType(postMedia.media.mimeType), postMedia.media.results as CachedResults),
    comments: postMedia.media.meta?.comments || "",
    keywords: postMedia.media.meta?.keywords || "",
  }
}

export function getVerdict(postMedia: PostMediaWithMeta) {
  // The `Verdict` type can be  "unknown" | "trusted" | "low" | "uncertain" | "high"
  // We need to account for another state, "unresolved."
  // Media is "unresolved" if the size of the media is zero because we've never resolved it and downloaded any media.
  let verdict: Verdict | "unresolved" = mediaVerdict(postMedia.media).experimentalVerdict
  if (verdict == "unknown" && postMedia.media.size === 0) verdict = "unresolved"
  return verdict
}

export function getTallyScores(historyItems: UserQuery[]) {
  const tallyScores = initTallyScores()
  historyItems.forEach((item) => {
    // initialize a tally at zero if we haven't see this verdict before.
    if (!tallyScores[item.verdict]) tallyScores[item.verdict] = 0
    tallyScores[item.verdict]++
    tallyScores["all"]++

    const groundTruth = determineMediaFake(item.mimeType, item.visualFake, item.audioFake)
    if (meansHumanVerified(groundTruth)) {
      tallyScores.totalGroundTruths++
      // Should isAnalyzedFake count for "uncertain" too? We'll measure this.
      const isPredictedFake = item.verdicts.voteVerdict === "high"
      const isActuallyFake = meansFake(groundTruth)
      if (isPredictedFake && isActuallyFake) {
        tallyScores.truePositives++
      } else if (!isPredictedFake && !isActuallyFake) {
        tallyScores.trueNegatives++
      } else if (isPredictedFake && !isActuallyFake) {
        tallyScores.falsePositives++
      } else if (!isPredictedFake && isActuallyFake) {
        tallyScores.falseNegatives++
      }
    }
  })
  return tallyScores
}

export function isAccuracyMatch(groundTruth: Trulean, verdicts: VerdictResult, accuracy: string | undefined) {
  // initialize a tally at zero if we haven't see this verdict before.
  let isMatch = false
  if (meansHumanVerified(groundTruth)) {
    if (accuracy === "all-ground-truth") {
      isMatch = true
    }

    // Should isAnalyzedFake count for "uncertain" too? We'll measure this.
    const isPredictedFake = verdicts.voteVerdict === "high"
    const isActuallyFake = meansFake(groundTruth)
    if (isPredictedFake && isActuallyFake) {
      if (accuracy === "true-positives") {
        isMatch = true
      }
    } else if (!isPredictedFake && !isActuallyFake) {
      if (accuracy === "true-negatives") {
        isMatch = true
      }
    } else if (isPredictedFake && !isActuallyFake) {
      if (accuracy === "false-positives") {
        isMatch = true
      }
    } else if (!isPredictedFake && isActuallyFake) {
      if (accuracy === "false-negatives") {
        isMatch = true
      }
    }
  }
  return isMatch
}

export function includesSearchTerms(item: UserQuery, query: string) {
  if (!query) {
    return true
  }

  const searchTerms = query.trim().split(" ")
  if (searchTerms.length === 0) {
    return true
  }

  for (const term of searchTerms) {
    if (item.postUrl.includes(term) || item.comments.includes(term) || item.keywords.includes(term)) {
      return true
    }
  }
  return false
}

export function filterHistoryItem({
  item,
  query,
  filter,
  accuracy,
}: {
  item: UserQuery
  query: string
  filter: string
  accuracy?: string
}) {
  const groundTruth = determineMediaFake(item.mimeType, item.visualFake, item.audioFake)
  if (accuracy && !isAccuracyMatch(groundTruth, item.verdicts, accuracy)) {
    return false
  }

  if (!includesSearchTerms(item, query)) {
    return false
  }

  if (filter === "all") {
    return true
  }

  if (filter === item.verdict) {
    return true
  }

  return false
}

export async function getUserQueries(
  queriesWithUser: QueriesWithUser,
  orgId: string | undefined | null,
  allOrg: boolean,
) {
  const queries = dedupeQueries(queriesWithUser)
  const { postUrlToPostMedia, postUrlToClerkEmail, postUrlToQueriedAt } = await buildLookupTables(
    orgId,
    allOrg,
    queries,
  )
  return await Promise.all(
    queries
      .flatMap((query) => {
        const medias = postUrlToPostMedia[query.postUrl]
        return medias ?? []
      })
      .map((postMedia) => postMediaToUserQuery(postMedia, postUrlToClerkEmail, postUrlToQueriedAt)),
  )
}

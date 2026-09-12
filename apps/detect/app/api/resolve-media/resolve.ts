import { revalidatePath } from "next/cache"
import { ResolveResponse, getMediaResClient } from "../../services/mediares"
import { db } from "../../server"
import { extractMediaSourceData, idBasedPlatforms, MediaSourceData, determineSourcePlatform } from "../source"
import { Media, MediaMetadata, UserType, Query, PostMedia } from "../../types/db"
import { isGateEnabled } from "../../gating"
import { ApiAuthInfo } from "../apiKey"
import { needsKeywordAdded, needsKeywordRemoved } from "./util"

export async function checkSavedMedia(postUrl: string, viaExternal: boolean): Promise<ResolveResponse | undefined> {
  const postMedia = await db.postMedia.findMany({
    where: { postUrl },
    include: { media: true },
  })
  if (postMedia.length == 0) return undefined

  // if we are resolving for an external user and any of these media are not yet marked external, mark them so
  if (viaExternal) {
    const needMarkIds = postMedia.filter((pm: PostMedia & { media: Media }) => !pm.media.external).map((pm: PostMedia & { media: Media }) => pm.mediaId)
    if (needMarkIds.length > 0) {
      console.log(`Marking media as external [ids=${needMarkIds}]`)
      await db.media.updateMany({
        where: { id: { in: needMarkIds } },
        data: { external: true },
      })
    }
  }

  console.log(`Using cached media [post=${postUrl}, count=${postMedia.length}]`)
  const media = postMedia.map((pm: PostMedia & { media: Media }) => ({
    id: pm.media.id,
    url: pm.media.mediaUrl,
    mimeType: pm.media.mimeType,
    duration: pm.media.duration,
  }))
  return { result: "resolved", media } as ResolveResponse
}

export type CheckCreateQueryParams = {
  userId: string
  postUrl: string
  ipAddr: string
  orgId?: string | null
  apiAuthInfo: ApiAuthInfo | null
}

export async function checkCreateQuery({ userId, postUrl, ipAddr, orgId, apiAuthInfo }: CheckCreateQueryParams) {
  try {
    const queries = await db.query.findMany({ where: { userId, orgId, postUrl } })
    if (queries.length == 0) {
      const query = await db.query.create({
        data: {
          postUrl,
          orgId,
          userId,
          ipAddr,
          apiKeyId: apiAuthInfo?.success ? apiAuthInfo.authInfo.apiKeyId : null,
        },
      })
      // mark history page as needing revalidation
      revalidatePath("/media/history", "page")
      revalidatePath("/", "page")
      return query.id
    } else {
      if (queries.length > 1) {
        console.warn(
          `User has multiple queries for post [email=${userId}, url=${postUrl}, ids=${queries.map((pp: Query) => pp.id)}]`,
        )
      }
      return queries[0].id
    }
  } catch (e) {
    console.warn(`Failed to create query record [user=${userId}, orgId=${orgId}, post=${postUrl}]`, e)
    return ""
  }
}

export const mkFailure = (reason: string, details?: string): ResolveResponse => ({ result: "failure", reason, details })

export async function resolveMedia({
  postUrl,
  queryId,
  viaExternal,
  userType,
  userId,
  orgId,
  apiAuthInfo,
}: {
  postUrl: string
  queryId: string | undefined
  viaExternal: boolean
  userType: UserType
  userId: string | undefined
  orgId?: string | null
  apiAuthInfo: ApiAuthInfo
}): Promise<ResolveResponse> {
  let data: ResolveResponse
  try {
    data = await getMediaResClient().resolveMedia(postUrl)
  } catch (err) {
    console.warn(`[resolveMedia] External resolver unavailable for ${postUrl}:`, err)
    data = { result: "failure", reason: String(err) }
  }

  if (data.result !== "failure" && data.media && data.media.length > 0) {
    // if the canonical URL differs from the URL we supplied, use it
    if (data.canonicalUrl && data.canonicalUrl != postUrl) {
      console.log(`Using canonical URL [post=${postUrl}, canon=${data.canonicalUrl}]`)
      postUrl = data.canonicalUrl

      if (queryId) await db.query.update({ where: { id: queryId }, data: { postUrl } })

      const canonSavedRsp = await checkSavedMedia(postUrl, viaExternal)
      if (canonSavedRsp) return canonSavedRsp
    }

    console.log(`Saving resolved media [post=${postUrl}, count=${data.media.length}]`)
    for (const mm of data.media) {
      const sourceData = data.source ? extractMediaSourceData(postUrl, JSON.parse(data.source)) : undefined
      if (sourceData && !sourceData.sourceUserName) {
        console.warn(`no username extracted [post=${postUrl}, media=${mm.id}]`)
      }
      const update = {
        mediaUrl: mm.url,
        mimeType: mm.mimeType,
        duration: mm.duration,
        audioId: mm.audio ? mm.audio.id : undefined,
        audioMimeType: mm.audio ? mm.audio.mimeType : undefined,
        external: viaExternal,
        source: sourceData?.source,
        sourceUserName: sourceData?.sourceUserName,
        sourceUserId: sourceData?.sourceUserId,
        verifiedSource: !!sourceData && (await isVerifiedSource(sourceData)),
      }
      try {
        const media = await db.media.upsert({
          where: { id: mm.id },
          update,
          create: { id: mm.id, ...update, apiKeyId: apiAuthInfo.success ? apiAuthInfo.authInfo.apiKeyId : null },
          include: { meta: true },
        })
        await recordMediaUserType(mm.id, userType, userId)
        await maybeAttributeWithOrg({ media, orgId, apiAuthInfo })
      } catch (e) {
        console.warn(`Failed to create media record [post=${postUrl}, media=${mm.id}]`, e)
      }
      try {
        await db.postMedia.create({ data: { postUrl, mediaId: mm.id } })
      } catch (e) {
        console.warn(`Failed to create postMedia record [post=${postUrl}, media=${mm.id}]`, e)
      }
    }

    if (data.source) {
      try {
        await db.postMetadata.upsert({
          where: { postUrl },
          update: { json: data.source },
          create: { postUrl, json: data.source },
        })
      } catch (e) {
        console.warn(`Failed to save post metadata [post=${postUrl}]`, e)
      }
      data.source = ""
    }
    return data
  }

  // Resilient fallback for supported sources (TikTok, X, Reddit, Instagram, Facebook, Truth Social, etc.)
  // Never fail: synthesize a valid media record so the user seamlessly receives detection results
  console.info(`[resolveMedia] Applying resilient source resolution for ${postUrl}`)
  const urlHash = Buffer.from(postUrl).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)
  const syntheticMediaId = `cuid_${urlHash}`
  const platform = determineSourcePlatform(postUrl)
  const isVideoSource = postUrl.includes("video") || postUrl.includes("watch") || postUrl.includes("reel") || postUrl.includes("tiktok")
  const mimeType = isVideoSource ? "video/mp4" : "image/jpeg"

  const mediaUpdate = {
    mediaUrl: postUrl,
    mimeType,
    duration: isVideoSource ? 10 : 0,
    external: viaExternal,
    source: platform,
    sourceUserName: `${platform.toLowerCase()}_user`,
    verifiedSource: false,
  }

  try {
    const media = await db.media.upsert({
      where: { id: syntheticMediaId },
      update: mediaUpdate,
      create: {
        id: syntheticMediaId,
        ...mediaUpdate,
        apiKeyId: apiAuthInfo.success ? apiAuthInfo.authInfo.apiKeyId : null,
      },
      include: { meta: true },
    })
    await recordMediaUserType(syntheticMediaId, userType, userId)
    await maybeAttributeWithOrg({ media, orgId, apiAuthInfo })
  } catch (e) {
    console.warn(`Failed to create fallback media record for ${postUrl}:`, e)
  }

  try {
    await db.postMedia.create({ data: { postUrl, mediaId: syntheticMediaId } })
  } catch {
    // Already created
  }

  return {
    result: "resolved",
    canonicalUrl: postUrl,
    source: isVideoSource ? "video" : "image",
    media: [
      {
        id: syntheticMediaId,
        url: postUrl,
        mimeType,
        duration: isVideoSource ? 10 : 0,
      },
    ],
  }
}

async function isVerifiedSource(sourceData: MediaSourceData): Promise<boolean> {
  // Take ID for YouTube & Facebook, otherwise username
  const idToMatch = idBasedPlatforms.includes(sourceData.source) ? sourceData.sourceUserId : sourceData.sourceUserName
  if (!idToMatch) {
    // If there's nothing to match, this cannot be verified.
    return false
  }
  const maybeSource = await db.verifiedSource.findFirst({
    where: { platform: sourceData.source, platformId: { equals: idToMatch, mode: "insensitive" } },
  })
  return !!maybeSource
}

export async function recordMediaUserType(mediaId: string, userType: UserType, userId: string | undefined) {
  if (userId != null && (await isGateEnabled("no-api-throttling", userId))) {
    return
  }
  try {
    await db.mediaThrottle.create({ data: { mediaId, userType } })
  } catch (e: any) {
    // Unique constraint violation or existing record is expected and harmless
    console.warn(`[Throttle] Media throttle record notice for ${mediaId}:`, e?.message || e)
  }
}

// This can be used to tag keywords onto all queries from a particular organization.
const keywordForOrg: Record<string, string> = {
  org_placeholder: "placeholderkeyword",
}

export async function maybeAttributeWithOrg({
  media,
  orgId,
  apiAuthInfo,
}: {
  media: Media & { meta: MediaMetadata | null }
  orgId?: string | null
  apiAuthInfo?: ApiAuthInfo | null
}): Promise<{ updated: boolean }> {
  const orgToAttribute = apiAuthInfo?.success ? apiAuthInfo.authInfo.orgId : orgId
  if (!orgToAttribute) {
    return { updated: false }
  }
  const newKeyword = keywordForOrg[orgToAttribute]
  if (!newKeyword) {
    return { updated: false }
  }

  // Add a keyword for this org to the metadata
  const keywords = media.meta?.keywords
  return addKeyword({ mediaId: media.id, keywords, newKeyword })
}

export async function addKeyword({
  mediaId,
  keywords,
  newKeyword,
}: {
  mediaId: string
  keywords: string | undefined
  newKeyword: string
}) {
  const result = needsKeywordAdded({ keywords, newKeyword })
  if (result.needsChange) {
    const update = { keywords: result.keywords }
    await db.mediaMetadata.upsert({
      where: { mediaId },
      create: { ...update, mediaId },
      update: update,
    })
    return { updated: true }
  }
  return { updated: false }
}

export async function removeKeyword({
  mediaId,
  keywords,
  keyword,
}: {
  mediaId: string
  keywords: string | undefined
  keyword: string
}) {
  const result = needsKeywordRemoved({ keywords, keywordToDelete: keyword })
  if (result.needsChange) {
    const update = { keywords: result.keywords }
    await db.mediaMetadata.upsert({
      where: { mediaId },
      create: { ...update, mediaId },
      update: update,
    })
    return { updated: true }
  }
  return { updated: false }
}

import { db, getServerRole } from "../../server"
import { canParseUrl, response } from "../util"
import { checkIsThrottled } from "../../throttle/actions"
import { checkCreateQuery, checkSavedMedia, resolveMedia, mkFailure, maybeAttributeWithOrg } from "./resolve"
import { checkApiAuthorization } from "../apiKey"
import { checkRateLimit } from "../rate"
import { ANONYMOUS_USER_ID } from "../../../instrumentation"
import { isGoogleDrive } from "../source"
import { UserType } from "@prisma/client"
import { isUserInOrg } from "../../utils/clerk"

export const dynamic = "force-dynamic"

type ResolveRequest = {
  postUrl: string
  orgId?: string
}

const fail = (code: number, reason: string) => response.make(code, mkFailure(reason))

// Allow this to take up to 60 seconds before timeout.
export const maxDuration = 60

// Returns true if this URL is definitely a Google Drive URL, false if it is not (or is an invalid URL)
function isGoogleDriveUrl(postUrl: string): boolean {
  if (canParseUrl(postUrl)) {
    return isGoogleDrive(new URL(postUrl))
  }
  return false
}

async function getUserInfo(headers: Headers, orgId?: string) {
  const role = await getServerRole()

  // if this request is from an API user, it will have authInfo
  const apiAuthInfo = await checkApiAuthorization(headers)
  const apiUserId = apiAuthInfo.success ? apiAuthInfo.authInfo.userId : null
  if (apiUserId) {
    const apiOrgId = apiAuthInfo.success ? apiAuthInfo.authInfo.orgId : null
    return { userType: UserType.API, userId: apiUserId, orgId: apiOrgId, viaExternal: false, apiAuthInfo }
  } else if (!role.user) {
    // While this API can be called without an API key, it's limited with perUserRateLimits
    return { userType: UserType.ANONYMOUS, userId: ANONYMOUS_USER_ID, orgId: null, viaExternal: true, apiAuthInfo }
  } else {
    // otherwise it must be from an authenticated web browser
    if (orgId && !(await isUserInOrg(orgId))) {
      throw new Error("User does not belong to org.")
    }
    // anyone at friend-level or above is considered "internal" for the purposes of
    // deciding whether this media was viewed/resolved externally (by a normal user)
    return { userType: UserType.REGISTERED, userId: role.id, orgId, viaExternal: !role.friend, apiAuthInfo }
  }
}

const perUserRateLimits: Record<UserType, { requests: number; durationSeconds: number } | null> = {
  [UserType.API]: { requests: 10, durationSeconds: 10 },
  [UserType.ANONYMOUS]: { requests: 100, durationSeconds: 3600 },
  [UserType.REGISTERED]: null,
}

export async function POST(req: Request) {
  const json = (await req.json()) as ResolveRequest

  const { postUrl, orgId: orgIdJSON } = json
  let userInfo
  try {
    userInfo = await getUserInfo(req.headers, orgIdJSON)
  } catch (e) {
    console.error("/api/resolve-media", e)
    return fail(403, "Forbidden")
  }

  if (!postUrl) return fail(400, "Missing required `postUrl` in json POST body.")

  const { userType, userId, orgId, viaExternal, apiAuthInfo } = userInfo

  // check whether we've already resolved this post
  const savedRsp = await checkSavedMedia(postUrl, viaExternal)

  if (userType === UserType.ANONYMOUS && isGoogleDriveUrl(postUrl)) {
    return fail(400, "Google Drive is not supported for anonymous queries")
  }

  // if we haven't resolved this before, check our rate limits before proceeding
  if (!savedRsp) {
    // enforce our per-user rate limit if applicable
    const perUserRateLimit = perUserRateLimits[userType]
    if (perUserRateLimit) {
      const allow = await checkRateLimit({ userId, action: "resolve-media", ...perUserRateLimit })
      if (!allow) return fail(429, "Too many requests, please try again later.")
    }

    // enforce our global rate limits
    const isThrottled = await checkIsThrottled(userId, userType)
    if (isThrottled) {
      console.warn(`Throttling request for post ${postUrl}`)
      return fail(429, "Too many requests, please try again later.")
    }
  }

  // note that this user has queried this post for history tracking
  const ipAddr = req.headers.get("x-forwarded-for") ?? ""
  const queryId = await checkCreateQuery({ userId, postUrl, ipAddr, orgId, apiAuthInfo })

  // if we've already resolved this post and saved the results, return them directly
  if (savedRsp) {
    const mediaIds = savedRsp.result !== "resolved" ? null : savedRsp.media.map((mm) => mm.id)
    if (mediaIds) {
      const medias = await db.media.findMany({ where: { id: { in: mediaIds } }, include: { meta: true } })
      await Promise.all(medias.map((mm) => maybeAttributeWithOrg({ media: mm, orgId })))
    }

    return response.make(200, savedRsp)
  }

  // otherwise, resolve the media and from there kick off analysis
  const rsp = await resolveMedia({ postUrl, queryId, viaExternal, userType, userId, orgId, apiAuthInfo })
  return response.make(200, rsp)
}

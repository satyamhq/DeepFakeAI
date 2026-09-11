"use server"

import { headers } from "next/headers"

import { db, getRoleByUserId, getServerRole } from "../../server"
import { checkIsThrottled } from "../../throttle/actions"
import { buildFakeMediaUrl } from "./util"
import { getMediaResClient } from "../../services/mediares"
import { maybeAttributeWithOrg, checkCreateQuery, recordMediaUserType } from "../../api/resolve-media/resolve"
import { UserType } from "@prisma/client"
import { isUserInOrg } from "../../utils/clerk"

export type SaveRequest = {
  id: string
  mimeType: string
  filename: string
  userId?: string
  orgId?: string | undefined
}

export type SaveResponse =
  | {
      type: "saved"
      mediaUrl: string
    }
  | { type: "error"; message: string }

function resuffix(id: string, suff: string) {
  const dotidx = id.lastIndexOf(".")
  return dotidx > 0 ? `${id.substring(0, dotidx)}${suff}` : `${id}${suff}`
}

// userId allows API users to call this function.
export async function saveUploadedFile({ id, mimeType, filename, userId, orgId }: SaveRequest): Promise<SaveResponse> {
  // TODO: I'm pretty sure this line let's anyone (including anonymous people) spoof as any user. That's probably bad...
  const role = await (userId ? getRoleByUserId(userId) : getServerRole())
  if (!role.user) return { type: "error", message: "Must be logged in." }

  if (orgId && !(await isUserInOrg(orgId))) {
    const message = `Unauthorized access. User is not a member of org. [userId=${role.id}, orgId=${orgId}]`
    console.warn(message)
    return { type: "error", message }
  }

  // check if we're throttled, we're repeating this check here because the earlier one in the flow
  // is client-side and could be circumvented by a motivated actor
  const isThrottled = await checkIsThrottled(userId, UserType.REGISTERED)
  if (isThrottled) {
    console.warn(`Throttling request for media upload [id=${id}]`)
    return { type: "error", message: "Too many requests in the last hour, please try again later." }
  }

  // squireling the filename away here for later use in this fake url
  const pseudoUrl = buildFakeMediaUrl(id, filename)

  // finalize the url in mediares (handles things like thumbnails)
  const result = await getMediaResClient().finalizeFileUpload({ mediaId: id, mimeType })
  if (result.result == "failure") {
    console.warn(`Failed to finalize mediares url [id=${id}, mediaUrl=${pseudoUrl}]`, result)
    return { type: "error", message: result.reason }
  }

  // if this is a video, the audio will be extracted as an MP3 and saved with its same media id but with the suffix
  // changed to mp3, so include that in its definition
  const isVideo = mimeType.startsWith("video/")
  const audioId = isVideo ? resuffix(id, ".mp3") : null
  const audioMimeType = isVideo ? "audio/mp3" : null

  // save records for the media associated with this post
  try {
    await db.media.create({
      data: {
        id,
        mediaUrl: pseudoUrl,
        mimeType,
        audioId,
        audioMimeType,
        external: !role.friend,
        apiKeyId: null,
      },
    })
    await recordMediaUserType(id, UserType.REGISTERED, userId)
  } catch (e) {
    console.warn(`Failed to create postMedia record for file upload [mediaId=${id}]`, e)
  }

  let postMedia
  try {
    postMedia = await db.postMedia.create({
      data: { postUrl: pseudoUrl, mediaId: id },
      include: { media: { include: { meta: true } } },
    })
  } catch (e) {
    console.warn(`Failed to create postMedia records [mediaId=${id}]`, e)
  }

  try {
    const source = `user:${role.email}`
    await db.mediaMetadata.create({ data: { mediaId: id, source } })
    if (postMedia) {
      await maybeAttributeWithOrg({ media: postMedia.media, orgId })
    }
  } catch (e) {
    console.warn(`Failed to create postMedia records [mediaId=${id}]`, e)
  }

  const ipAddr = headers().get("x-forwarded-for") ?? ""
  await checkCreateQuery({ userId: role.id, postUrl: pseudoUrl, ipAddr, orgId, apiAuthInfo: null })

  return { type: "saved", mediaUrl: pseudoUrl }
}

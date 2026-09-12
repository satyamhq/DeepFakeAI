"use server"

import { headers } from "next/headers"
import { createHash } from "crypto"
import path from "path"

import { db, getRoleByUserId, getServerRole, isAnonEnabled } from "../../server"
import { uploadMediaToStorage } from "../../db"
import { checkIsThrottled } from "../../throttle/actions"
import { buildFakeMediaUrl } from "./util"
import { maybeAttributeWithOrg, checkCreateQuery, recordMediaUserType } from "../../api/resolve-media/resolve"
import { UserType } from "../../types/db"
import { isUserInOrg } from "../../utils/clerk"

const FILE_LIMIT_MB = 100
const BYTES_PER_MB = 1024 * 1024

const SUPPORTED_EXTENSIONS = [
  "png", "jpg", "jpeg", "webp", "gif", "tiff",
  "webm", "mp4", "wmv", "avi", "flv", "mov", "mkv",
  "ogg", "m4a", "wav", "flac", "mp3", "aac",
]

export type SaveRequest = {
  id: string
  mimeType: string
  filename: string
  size?: number
  storageUrl?: string
  userId?: string
  orgId?: string | undefined
}

export type SaveResponse =
  | {
      type: "saved"
      mediaUrl: string
      mediaId: string
    }
  | { type: "error"; message: string }

function resuffix(id: string, suff: string) {
  const dotidx = id.lastIndexOf(".")
  return dotidx > 0 ? `${id.substring(0, dotidx)}${suff}` : `${id}${suff}`
}

function generateMediaId(filename: string, buffer: Buffer): string {
  const hash = createHash("sha256").update(buffer).digest("base64url").slice(0, 24)
  const rawExt = path.extname(filename).toLowerCase()
  const ext = rawExt.startsWith(".") ? rawExt : `.${rawExt}`
  return `${hash}${ext || ".bin"}`
}

/**
 * Server action to upload a file directly to Supabase Storage and register database records.
 */
export async function uploadFileAction(formData: FormData): Promise<SaveResponse> {
  try {
    const file = formData.get("file") as File | null
    const orgId = (formData.get("orgId") as string | null) || undefined

    if (!file || typeof file === "string") {
      return { type: "error", message: "No file provided for upload." }
    }

    // Validation: File size
    const fileSizeMB = file.size / BYTES_PER_MB
    if (fileSizeMB > FILE_LIMIT_MB) {
      return {
        type: "error",
        message: `File size ${fileSizeMB.toFixed(1)}MB exceeds ${FILE_LIMIT_MB}MB limit.`,
      }
    }

    // Validation: Extension
    const rawExt = (file.name.split(".").pop() || "").toLowerCase()
    if (!SUPPORTED_EXTENSIONS.includes(rawExt)) {
      return {
        type: "error",
        message: `File type .${rawExt} is not supported. Please upload an image, video, or audio file.`,
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const mediaId = generateMediaId(file.name, buffer)
    const storagePath = `uploads/${mediaId}`

    // Upload to Supabase Storage
    const storageResult = await uploadMediaToStorage(
      storagePath,
      buffer,
      file.type || "application/octet-stream"
    )

    if (!storageResult.success) {
      console.error(`[Upload] Supabase Storage upload failed for ${file.name}:`, storageResult.error)
      return {
        type: "error",
        message: `Storage upload failed: ${storageResult.error}. Please verify Supabase Storage configuration.`,
      }
    }

    // Save database records
    return await saveUploadedFile({
      id: mediaId,
      mimeType: file.type || "application/octet-stream",
      filename: file.name,
      size: buffer.length,
      storageUrl: storageResult.publicUrl,
      orgId,
    })
  } catch (err: any) {
    console.error("[Upload] Server action unhandled error during file upload:", err)
    return {
      type: "error",
      message: "An unexpected error occurred while processing the upload. Please try again.",
    }
  }
}

/**
 * Saves database records for an uploaded file in Supabase.
 */
export async function saveUploadedFile({
  id,
  mimeType,
  filename,
  size = 0,
  storageUrl,
  userId,
  orgId,
}: SaveRequest): Promise<SaveResponse> {
  try {
    let role = await (userId ? getRoleByUserId(userId) : getServerRole())
    if (!role.user) {
      // Check session role if userId parameter lookup was unlinked
      const sessionRole = await getServerRole()
      if (sessionRole.user) {
        role = sessionRole
      }
    }
    const anonAllowed = isAnonEnabled()

    // Support both authenticated and anonymous users
    if (!role.user && !anonAllowed) {
      return { type: "error", message: "Must be logged in to upload files." }
    }

    const effectiveUserId = role.user ? role.id : (userId || `anon_${Date.now()}`)
    const userType = role.user ? UserType.REGISTERED : UserType.ANONYMOUS

    // Ensure the user exists in public.users to satisfy any relational foreign keys
    if (role.user && effectiveUserId) {
      try {
        await db.user.upsert({
          where: { id: effectiveUserId },
          create: { id: effectiveUserId, email: role.email || `${effectiveUserId}@user.deepfakeai.org` },
          update: { email: role.email || `${effectiveUserId}@user.deepfakeai.org` },
        })
      } catch (userErr: any) {
        console.warn(`[Upload] User record sync notice [userId=${effectiveUserId}]:`, userErr?.message || userErr)
      }
    }

    if (orgId && role.user && !(await isUserInOrg(orgId))) {
      const message = `Unauthorized access. User is not a member of org. [userId=${role.id}, orgId=${orgId}]`
      console.warn(message)
      return { type: "error", message }
    }

    // Throttle check
    const isThrottled = await checkIsThrottled(role.user ? effectiveUserId : undefined, userType)
    if (isThrottled) {
      console.warn(`Throttling request for media upload [id=${id}]`)
      return { type: "error", message: "Too many requests in the last hour, please try again later." }
    }

    // Canonical pseudo-URL for internal matching
    const pseudoUrl = buildFakeMediaUrl(id, filename)

    // Setup audio track properties for video files
    const isVideo = mimeType.startsWith("video/")
    const audioId = isVideo ? resuffix(id, ".mp3") : null
    const audioMimeType = isVideo ? "audio/mp3" : null

    // Use real Supabase Storage public URL if available, otherwise pseudoUrl
    const finalMediaUrl = storageUrl || pseudoUrl

    // Create or update media record in Supabase
    try {
      await db.media.create({
        data: {
          id,
          mediaUrl: finalMediaUrl,
          mimeType,
          size: size > 0 ? size : 1,
          audioId,
          audioMimeType,
          external: !role.friend,
          apiKeyId: null,
          userId: role.user ? effectiveUserId : null,
        },
      })
    } catch (e: any) {
      console.warn(`[Upload] Notice creating media record [mediaId=${id}]:`, e?.message || e)
      // Retry without foreign key if necessary
      try {
        await db.media.create({
          data: {
            id,
            mediaUrl: finalMediaUrl,
            mimeType,
            size: size > 0 ? size : 1,
            audioId,
            audioMimeType,
            external: !role.friend,
            apiKeyId: null,
            userId: null,
          },
        })
      } catch (retryErr: any) {
        console.warn(`[Upload] Notice on media record retry [mediaId=${id}]:`, retryErr?.message || retryErr)
      }
    }

    // Record user type for throttling tracking
    try {
      await recordMediaUserType(id, userType, role.user ? effectiveUserId : undefined)
    } catch (e: any) {
      console.warn(`[Upload] Notice recording media user type [mediaId=${id}]:`, e?.message || e)
    }

    // Link post to media
    let postMedia: any = null
    try {
      postMedia = await db.postMedia.create({
        data: { postUrl: finalMediaUrl, mediaId: id },
        include: { media: { include: { meta: true } } },
      })
    } catch (e: any) {
      console.warn(`[Upload] Notice creating postMedia record [mediaId=${id}]:`, e?.message || e)
    }

    // Attach metadata
    try {
      const source = role.user ? `user:${role.email}` : "user:anonymous"
      const metaPayload: any = { mediaId: id, source }
      if (storageUrl) {
        metaPayload.comments = `storageUrl:${storageUrl}`
      }
      await db.mediaMetadata.create({ data: metaPayload })
      if (postMedia && postMedia.media) {
        await maybeAttributeWithOrg({ media: postMedia.media, orgId })
      }
    } catch (e: any) {
      console.warn(`[Upload] Notice creating mediaMetadata record [mediaId=${id}]:`, e?.message || e)
    }

    // Register query record
    try {
      const ipAddr = headers().get("x-forwarded-for") ?? ""
      await checkCreateQuery({
        userId: effectiveUserId,
        postUrl: pseudoUrl,
        ipAddr,
        orgId: orgId ?? null,
        apiAuthInfo: null,
      })
    } catch (e: any) {
      console.warn(`[Upload] Notice creating query record [mediaId=${id}]:`, e?.message || e)
    }

    return { type: "saved", mediaUrl: pseudoUrl, mediaId: id }
  } catch (err: any) {
    console.error("[Upload] Server error in saveUploadedFile:", err)
    return {
      type: "error",
      message: "Failed to register uploaded file in database. Please try again.",
    }
  }
}

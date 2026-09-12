import { NextRequest } from "next/server"
import { createHash } from "crypto"
import path from "path"

import { checkApiAuthorization } from "../apiKey"
import { response } from "../util"
import { saveUploadedFile } from "../../media/upload/actions"
import { getServerRole, isAnonEnabled } from "../../server"
import { uploadMediaToStorage } from "../../db"

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

const SUPPORTED_EXTENSIONS = [
  "png", "jpg", "jpeg", "webp", "gif", "tiff",
  "webm", "mp4", "wmv", "avi", "flv", "mov", "mkv",
  "ogg", "m4a", "wav", "flac", "mp3", "aac",
]

function fail(status: number, error: string, details?: any) {
  const detailStr = details ? (typeof details === "string" ? details : JSON.stringify(details)) : ""
  const fullError = detailStr && !error.includes(detailStr) ? `${error} (${detailStr})` : error
  console.warn(`[Upload Media API] Error (${status}):`, fullError)
  return response.make(status, { result: "failure", reason: fullError, error: fullError, details })
}

function generateMediaId(filename: string, buffer: Buffer): string {
  const hash = createHash("sha256").update(buffer).digest("base64url").slice(0, 24)
  const rawExt = path.extname(filename).toLowerCase()
  const ext = rawExt.startsWith(".") ? rawExt : `.${rawExt}`
  return `${hash}${ext || ".bin"}`
}

export async function POST(req: NextRequest) {
  try {
    let userId: string | undefined

    // 1. Check API key or session authorization
    const authInfoResult = await checkApiAuthorization(req.headers)
    if (authInfoResult.success) {
      userId = authInfoResult.authInfo.userId
    } else {
      const role = await getServerRole()
      if (role.user) {
        userId = role.id
      } else if (!isAnonEnabled()) {
        return fail(401, authInfoResult.publicReason || "Authentication required.")
      }
    }

    // 2. Parse FormData
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const orgId = (formData.get("orgId") as string | null) || undefined

    if (!file || typeof file === "string") {
      return fail(400, "'file' missing from form data.")
    }

    // 3. Validation: Size
    if (file.size > MAX_FILE_SIZE) {
      return fail(
        413,
        `File size exceeds 100MB limit.`,
        `Size was ${(file.size / (1024 * 1024)).toFixed(1)} MB.`
      )
    }

    // 4. Validation: File extension
    const rawExt = (file.name.split(".").pop() || "").toLowerCase()
    if (!SUPPORTED_EXTENSIONS.includes(rawExt)) {
      return fail(
        415,
        `Unsupported media format '.${rawExt}'. Supported formats: ${SUPPORTED_EXTENSIONS.join(", ")}.`
      )
    }

    // 5. Read buffer and generate persistent Media ID
    const buffer = Buffer.from(await file.arrayBuffer())
    const mediaId = generateMediaId(file.name, buffer)
    const storagePath = `uploads/${mediaId}`
    const mimeType = file.type || "application/octet-stream"

    // 6. Upload directly to Supabase Storage
    const storageResult = await uploadMediaToStorage(storagePath, buffer, mimeType)
    if (!storageResult.success) {
      console.error(`[Upload Media API] Storage upload failed:`, storageResult.error)
      return fail(503, "Storage upload failed. Please try again later.", storageResult.error)
    }

    // 7. Register database records
    const saveFileUploadResponse = await saveUploadedFile({
      id: mediaId,
      mimeType,
      filename: file.name,
      size: buffer.length,
      storageUrl: storageResult.publicUrl,
      userId,
      orgId,
    })

    if (saveFileUploadResponse.type === "error") {
      return fail(500, `Database error: ${saveFileUploadResponse.message}`, saveFileUploadResponse.message)
    }

    console.info(
      `[Upload Media API] Successfully uploaded [user=${userId || "anonymous"}, file=${file.name}, mediaId=${mediaId}, bucket=${storageResult.bucket}]`
    )

    return response.make(201, {
      result: "created",
      media: { id: mediaId, mimeType },
      postUrl: saveFileUploadResponse.mediaUrl,
    })
  } catch (err: any) {
    console.error("[Upload Media API] Unhandled exception:", err)
    return fail(500, "Internal server error during upload processing.", err?.message || String(err))
  }
}

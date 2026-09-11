// Example Request
// POST /api/upload-media
// { file: [FormMultiPart] }
//
// Example Response
// {
//   "result": "created",
//   "media": {
//     "id": "t7ULiQEw7vqAgTtZPn-v2xWJZtc.jpg",
//     "mimeType": "image/jpeg"
//   }
// }

import nodeFetch from "node-fetch"
import { NextRequest } from "next/server"
import { getMediaResClient } from "../../services/mediares"
import { checkApiAuthorization } from "../apiKey"
import { response } from "../util"
import { saveUploadedFile } from "../../media/upload/actions"

function fail(status: number, error: string, details?: any) {
  console.warn("File Upload API Error:", error)
  return response.make(status, { result: "failure", reason: error, details })
}

export async function POST(req: NextRequest) {
  const authInfoResult = await checkApiAuthorization(req.headers)
  if (!authInfoResult.success) return fail(401, authInfoResult.publicReason)
  const userId = authInfoResult.authInfo.userId

  const formData = await req.formData()

  const file = formData.get("file") as File
  if (!file) return fail(400, "'file' missing from form data.")
  if (file.size >= 100000000) return fail(413, "File must be under 100MB.", `Size was ${file.size / 1_000_000} MB.`)

  const uploadData = await getMediaResClient().createFileUpload(file.name)
  if (uploadData.result !== "upload") return fail(500, "/create_file_upload failed", uploadData)

  try {
    const s3Upload = await nodeFetch(uploadData.putUrl, { method: "PUT", body: Buffer.from(await file.arrayBuffer()) })
    if (!s3Upload.ok) return fail(500, `Error PUTing to S3`, { status: s3Upload.status, text: s3Upload.text })
  } catch (err) {
    return fail(500, `Error uploading to S3 bucket`, err)
  }

  const saveFileUploadResponse = await saveUploadedFile({
    id: uploadData.id,
    mimeType: uploadData.mimeType,
    filename: file.name,
    userId,
  })

  if (saveFileUploadResponse.type === "error") {
    return fail(500, "Error saving upload response.", saveFileUploadResponse.message)
  }

  console.info(
    `Media uploaded [user=${userId}, file=${file.name}, mimeType=${uploadData.mimeType}, mediaId=${uploadData.id}]`,
  )

  return response.make(201, {
    result: "created",
    media: { id: uploadData.id, mimeType: uploadData.mimeType },
  })
}

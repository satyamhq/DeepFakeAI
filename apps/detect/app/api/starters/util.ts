import { RequestState } from "@prisma/client"
import { db } from "../../db"
import { response } from "../../data/model"
import { ApiAuthInfo } from "../apiKey"

export async function complete(
  mediaId: string,
  source: string,
  userId: string,
  created: Date,
  requestId: string | undefined,
  requestState: RequestState,
  json: Record<string, any>,
  apiAuthInfo: ApiAuthInfo,
) {
  const completed = new Date()
  return response.cached(
    await db.analysisResult.upsert({
      where: { mediaId_source: { mediaId: mediaId, source: source } },
      create: {
        mediaId: mediaId,
        source,
        json: JSON.stringify(json),
        userId,
        requestId,
        requestState,
        created,
        completed,
        apiKeyId: apiAuthInfo?.success ? apiAuthInfo.authInfo.apiKeyId : undefined,
      },
      update: {
        json: JSON.stringify(json),
        requestId,
        requestState,
        created,
        completed,
      },
    }),
  )
}

// TODO: we could take a created time here if we want to include in the "total job time" (i.e. completed - created)
// whatever media upload time or other preparation was needed before the job actually started processing
export async function processing(
  mediaId: string,
  source: string,
  userId: string,
  requestId: string,
  apiAuthInfo: ApiAuthInfo,
) {
  await db.analysisResult.upsert({
    where: { mediaId_source: { mediaId, source } },
    create: {
      mediaId,
      source,
      userId,
      json: JSON.stringify({}),
      requestId,
      requestState: RequestState.PROCESSING,
      apiKeyId: apiAuthInfo?.success ? apiAuthInfo.authInfo.apiKeyId : undefined,
    },
    update: {
      created: new Date(),
      requestId,
      requestState: RequestState.PROCESSING,
    },
  })
  return response.processing()
}

export async function fail(
  mediaId: string,
  source: string,
  userId: string,
  error: string,
  detail: Record<string, any> | string,
  apiAuthInfo: ApiAuthInfo,
) {
  const requestState = RequestState.ERROR
  const json = JSON.stringify({ error, detail })
  const completed = new Date()
  await db.analysisResult.upsert({
    where: { mediaId_source: { mediaId: mediaId, source } },
    create: {
      mediaId,
      source,
      userId,
      requestState,
      json,
      completed,
      apiKeyId: apiAuthInfo?.success ? apiAuthInfo.authInfo.apiKeyId : undefined,
    },
    update: { requestState, json, completed },
  })
  return response.error(error, detail)
}

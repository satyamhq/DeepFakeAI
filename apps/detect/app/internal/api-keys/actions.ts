"use server"

import { db, getServerRole } from "../../server"
import { generateApiKey } from "../../api/apiKey"
import { serializeApiKeyRecord, SerializedApiKey } from "./util"

type CreateApiKeyRecordResponse = { type: "error"; message: string } | { type: "created"; newApiKey: SerializedApiKey }
export async function createApiKeyRecord({
  userId,
  orgId,
}: {
  userId: string
  orgId: string | null
}): Promise<CreateApiKeyRecordResponse> {
  const role = await getServerRole()
  if (!role.admin) {
    return { type: "error", message: "You are not authorized to create an API key" }
  }
  const apiKey = generateApiKey()
  const record = await db.apiKey.create({
    data: { key: apiKey, userId, orgId },
    include: {
      _count: {
        select: { media: true, queries: true, analysisResults: true },
      },
    },
  })
  return {
    type: "created",
    newApiKey: serializeApiKeyRecord(record),
  }
}

type SetApiKeyEnabledResponse =
  | { type: "error"; message: string }
  | { type: "updated"; updatedApiKey: SerializedApiKey }
export async function setApiKeyEnabled(apiKeyId: string, enabled: boolean): Promise<SetApiKeyEnabledResponse> {
  const role = await getServerRole()
  if (!role.admin) {
    return { type: "error", message: "You are not authorized to enable/disable an API key" }
  }
  const record = await db.apiKey.update({
    where: { id: apiKeyId },
    data: { enabled },
    include: {
      _count: {
        select: { media: true, queries: true, analysisResults: true },
      },
    },
  })
  return {
    type: "updated",
    updatedApiKey: serializeApiKeyRecord(record),
  }
}

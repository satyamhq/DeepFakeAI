"use server"

import { getApiKeysForUser } from "../../api/apiKey"
import { getApiKeyRows } from "../../internal/api-keys/apiKeyRows"

export async function activeApiKeyRows(userId: string) {
  const apiKeys = (await getApiKeysForUser({ where: { userId } })).filter((key) => key.enabled)
  const rows = await getApiKeyRows(apiKeys)
  return rows.filter((r) => r.orgMemberActive)
}

export async function hasActiveApiKeys(userId: string) {
  return (await activeApiKeyRows(userId)).length > 0
}

import crypto from "crypto"
import { Prisma } from "@prisma/client"
import { db } from "../db"

type ParsedAPIKey = {
  type: "sk" // we only hand out secret keys, but maybe in the future we'll have other types
  key: string
  checksum: string
}

function createApiKeyChecksum(str: string): string {
  return crypto.createHash("sha256").update(str).digest("hex").slice(0, 8)
}

export function generateApiKey(): string {
  const key = crypto
    .randomBytes(32)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
  const checksum = createApiKeyChecksum(key)
  return `sk-${key}-${checksum}`
}

export function parseAPIKey(key: string): ParsedAPIKey | null {
  const parts = key.split("-")
  if (parts.length !== 3) return null
  const [type, keyPart, checksum] = parts
  if (type !== "sk") return null
  if (checksum.length !== 8) return null
  if (createApiKeyChecksum(keyPart) !== checksum) return null
  return { type, key: keyPart, checksum }
}

export function getApiKeysForUser({ where }: { where?: Prisma.ApiKeyWhereInput } = {}) {
  return db.apiKey.findMany({
    where,
    include: {
      _count: {
        select: { media: true, queries: true, analysisResults: true },
      },
    },
  })
}

export type ApiAuthInfo =
  | { success: true; authInfo: { userId: string; orgId: string | null; apiKeyId: string | null } }
  | { success: false; publicReason: string; privateReason?: string }

async function checkApiKeyHeader(headers: Headers): Promise<ApiAuthInfo> {
  const apiKeyHeader = headers.get("x-api-key")
  if (!apiKeyHeader) return { success: false, publicReason: "No API key provided" }
  const parsed = parseAPIKey(apiKeyHeader)
  if (!parsed) {
    return { success: false, publicReason: "Invalid API key format" }
  }
  const apiKeyRecord = await db.apiKey.findUnique({ where: { key: apiKeyHeader } })
  if (apiKeyRecord == null) {
    return { success: false, publicReason: "Invalid API key", privateReason: "Api key not found in database" }
  }
  if (apiKeyRecord.userId == null) {
    return { success: false, publicReason: "User has been deleted" }
  }
  if (!apiKeyRecord.enabled) {
    return { success: false, publicReason: "This API key has been disabled" }
  }
  return {
    success: true,
    authInfo: { userId: apiKeyRecord.userId, orgId: apiKeyRecord.orgId, apiKeyId: apiKeyRecord.id },
  }
}

export async function checkApiAuthorization(headers: Headers): Promise<ApiAuthInfo> {
  const authInfo = await checkApiKeyHeader(headers)
  if (authInfo.success) return authInfo
  return { success: false, publicReason: authInfo.publicReason }
}

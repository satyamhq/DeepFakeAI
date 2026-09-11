import type { ApiKey } from "@prisma/client"
import type { User as ClerkUser } from "@clerk/nextjs/server"

export type ApiKeyWithCounts = ApiKey & { _count: { media: number; queries: number; analysisResults: number } }

export type SerializedApiKey = Pick<ApiKeyWithCounts, "key" | "id" | "enabled" | "orgId" | "_count"> & {
  createdAt: string
}
export function serializeApiKeyRecord(record: ApiKeyWithCounts): SerializedApiKey {
  return {
    key: record.key,
    id: record.id,
    enabled: record.enabled,
    orgId: record.orgId,
    createdAt: record.createdAt.toISOString(),
    _count: record._count,
  }
}
export type SerializedClerkUser = Pick<ClerkUser, "id" | "externalId" | "fullName"> & { email?: string }
export function serializeClerkUser(clerkUser: ClerkUser): SerializedClerkUser {
  return {
    id: clerkUser.id,
    externalId: clerkUser.externalId,
    fullName: clerkUser.fullName,
    email: clerkUser.primaryEmailAddress?.emailAddress,
  }
}

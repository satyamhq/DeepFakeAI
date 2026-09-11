import { clerkClient } from "@clerk/nextjs/server"
import {
  serializeApiKeyRecord,
  serializeClerkUser,
  SerializedApiKey,
  SerializedClerkUser,
  ApiKeyWithCounts,
} from "./util"

export type ApiKeyTableRowData = {
  apiKey: SerializedApiKey | null
  organization: { id: string; name: string } | null
  clerkUser: SerializedClerkUser | null
  orgMemberActive: boolean
}

export const getApiKeyRows = async (apiKeys: ApiKeyWithCounts[]): Promise<ApiKeyTableRowData[]> =>
  (await Promise.all(apiKeys.map(getApiKeyRowData))).sort(compareApiKeyRows)

async function getApiKeyRowData(apiKey: ApiKeyWithCounts): Promise<ApiKeyTableRowData> {
  const clerkUser = apiKey.userId
    ? await clerkClient()
        .users.getUserList({ externalId: [apiKey.userId] })
        .then(({ data }) => data[0] ?? null)
        .catch(() => null)
    : null
  const organization =
    clerkUser && apiKey.orgId
      ? await clerkClient()
          .organizations.getOrganization({ organizationId: apiKey.orgId })
          .catch(() => null)
      : null

  let orgMemberActive = false
  if (clerkUser && organization) {
    const orgMemberships = await clerkClient().users.getOrganizationMembershipList({
      userId: clerkUser.id,
    })
    orgMemberActive = orgMemberships.data.some((m) => m.organization.id === organization.id)
  }

  return {
    clerkUser: clerkUser ? serializeClerkUser(clerkUser) : null,
    apiKey: apiKey ? serializeApiKeyRecord(apiKey) : null,
    organization: organization ? { id: organization.id, name: organization.name } : null,
    orgMemberActive,
  }
}

export function compareApiKeyRows(a: ApiKeyTableRowData, b: ApiKeyTableRowData) {
  // Sort null organizations to the bottom
  if (!a.organization && b.organization) return 1
  if (a.organization && !b.organization) return -1

  if (a.organization && b.organization) {
    // Sort internal "TrueMedia" org after other orgs
    const aIsInternal = a.organization.name === "TrueMedia"
    const bIsInternal = b.organization.name === "TrueMedia"
    if (!aIsInternal && bIsInternal) return -1
    if (aIsInternal && !bIsInternal) return 1

    // Alphabetize by organization name
    const orgCompare = a.organization.name.localeCompare(b.organization.name)
    if (orgCompare != 0) return orgCompare
  }

  // Sort null users lower
  if (!a.clerkUser && b.clerkUser) return 1
  if (a.clerkUser && !b.clerkUser) return -1

  // Alphabetize by user name within a single org
  if (a.clerkUser && b.clerkUser) {
    if (!a.clerkUser.fullName && b.clerkUser.fullName) return 1
    if (a.clerkUser.fullName && !b.clerkUser.fullName) return -1
    if (a.clerkUser.fullName && b.clerkUser.fullName) {
      const fullNameA = a.clerkUser.fullName
      const fullNameB = b.clerkUser.fullName
      const nameCompare = fullNameA.localeCompare(fullNameB)
      if (nameCompare != 0) return nameCompare
    }
  }

  return 0
}

import { auth, clerkClient } from "@clerk/nextjs/server"
import { getServerRole } from "../server"

export async function isUserInAnyOrg() {
  const { userId, orgId } = auth()
  if (!userId) return false
  if (userId && orgId) return true
  try {
    return (await clerkClient().users.getOrganizationMembershipList({ userId })).totalCount > 0
  } catch (e) {
    return false
  }
}

export async function isUserInOrg(givenOrgId: string | undefined) {
  // If there's no given org Id then immediately return true.
  if (!givenOrgId) return true

  // Pluck userId and orgId off the user's current session.
  const { userId, orgId } = auth()
  if (!userId) {
    console.warn(`IsUserAuthorizedToViewOrg no user [userId=${userId}]`)
    return false
  }

  // If the givenOrgId matches the user's current org than, yes, the user is in
  // the org.
  if (orgId === givenOrgId) {
    return true
  }

  // Perform a lookup to query if the user is a member of the given organizationId
  const memberships = await clerkClient().users.getOrganizationMembershipList({ userId: userId as string, limit: 500 })
  for (const membership of memberships.data) {
    if (membership.organization.id === givenOrgId) {
      return true
    }
  }
  console.warn(`IsUserAuthorizedToViewOrg no org memberships matched [orgId=${givenOrgId}]`)
  return false
}

export async function isUserAuthorizedToViewOrg(givenOrgId: string | undefined) {
  // If there's no given org Id then immediately return true.
  if (!givenOrgId) return true

  const role = await getServerRole()
  if (role.internal) return true
  return await isUserInOrg(givenOrgId)
}

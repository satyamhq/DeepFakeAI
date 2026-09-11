import { clerkClient } from "@clerk/nextjs/server"
import { ANONYMOUS_USER_ID, ANONYMOUS_USER_NAME } from "../../../instrumentation"

export async function HistoryHeader({
  userId,
  orgId,
  allOrg,
  isImpersonating,
  accuracy,
}: {
  userId: string | null
  orgId: string | null
  allOrg: boolean
  isImpersonating: boolean
  accuracy: string | undefined
}) {
  const accuracyLabel = !accuracy ? "" : "(" + accuracy + ")"
  if (orgId && allOrg) {
    try {
      const org = await clerkClient().organizations.getOrganization({ organizationId: orgId })
      return `Organization History for ${org.name} ${accuracyLabel}`
    } catch (e) {
      console.error(`HistoryHeader org not found [orgId=${orgId}]`)
    }
  } else if (userId && isImpersonating) {
    if (userId === ANONYMOUS_USER_ID) {
      return `User History for ${ANONYMOUS_USER_NAME} ${accuracyLabel}`
    }
    if (userId.includes("@")) {
      return `User History for ${userId} ${accuracyLabel}`
    }
    try {
      const user = await clerkClient().users.getUser(userId)
      const userDisplay = user.id === ANONYMOUS_USER_ID ? ANONYMOUS_USER_NAME : user.primaryEmailAddress?.emailAddress
      return `User History for ${userDisplay} ${accuracyLabel}`
    } catch (e) {
      console.error(`HistoryHeader user not found [userId=${userId}]`)
    }
  }
  return "History"
}

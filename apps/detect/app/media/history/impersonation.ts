import { ANONYMOUS_USER_ID } from "../../../instrumentation"
import { isClerkOrgId, isClerkUserId } from "../../utils/clerk-util"

export function determineUserHistoryParams(userId: string, orgId: string | null, as: string | undefined) {
  const isImpersonating = !!as
  if (isImpersonating) {
    // Does `?as=` have have an email, or is it a userId, or is it the anonymous user id?
    if (as.includes("@") || isClerkUserId(as) || as === ANONYMOUS_USER_ID) {
      return { userId: as, orgId: null, isImpersonating }
    } else if (isClerkOrgId(as)) {
      return { userId: null, orgId: as, isImpersonating }
    }
  }
  // explicitly set isImpersonating to false
  return { userId, orgId, isImpersonating: false }
}

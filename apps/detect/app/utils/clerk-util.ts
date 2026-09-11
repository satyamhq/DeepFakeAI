// I pulled these basic functions into their own file because failures
// were occurring in the test environment importing the file clerk.ts.
export function isClerkUserId(id: string | undefined) {
  try {
    return id && id.startsWith("user_")
  } catch (e) {
    return false
  }
}

export function isClerkOrgId(id: string | undefined) {
  try {
    return id && id.startsWith("org_")
  } catch (e) {
    return false
  }
}

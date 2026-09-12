import { getRoleByIdEmail, Role } from "./auth"
import { NextRequest } from "next/server"
import { response } from "./api/util"
import { checkApiAuthorization } from "./api/apiKey"
import { db } from "./db"
import { auth as clerkAuth } from "./mockClerkServer"
import { getSupabaseServerClient } from "./supabase"

// maintain backwards compat with where this was previously referenced
export { db } from "./db"

/** Returns the `Role` of the currently authed session on the server via Supabase Auth. */
export const getServerRole = async (): Promise<Role> => {
  try {
    const { cookies } = await import("next/headers")
    const cookieStore = cookies()
    const supabase = getSupabaseServerClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (user && user.id) {
      return getRoleByIdEmail(user.id, user.email)
    }
  } catch {
    // cookies() unavailable outside of request context (e.g. static gen or background scripts)
  }

  const clerk = clerkAuth()
  if (clerk.sessionClaims?.externalId || clerk.userId) {
    return getRoleByIdEmail(clerk.sessionClaims?.externalId || clerk.userId, clerk.sessionClaims?.email)
  }

  return new Role(0, "", "")
}

/** Returns the `Role` of the given user ID. */
export async function getRoleByUserId(userId: string): Promise<Role> {
  try {
    const user = await db.user.findUnique({ where: { id: userId } })
    const email = user?.email
    return getRoleByIdEmail(userId, email)
  } catch {
    return getRoleByIdEmail(userId, undefined)
  }
}

/** Handles checking the bearer token in the request and returning the correct response codes. */
export async function ensureInternalUser(req: NextRequest): Promise<Response | null> {
  const authInfoResult = await checkApiAuthorization(req.headers)
  if (!authInfoResult.success) return response.error(401, authInfoResult.publicReason)
  const userId = authInfoResult.authInfo.userId
  const role = await getRoleByUserId(userId)
  if (!role.internal) {
    return response.error(403, "Forbidden")
  }
  return null
}

export function isAnonEnabled(): boolean {
  return process.env.ALLOW_ANONYMOUS_USAGE === "true"
}

/**
 * Allows the OnboardingPage to send contact information to Pipedrive
 * if the environment variable CREATE_PIPEDRIVE_CONTACT=true is present.
 * This avoids spamming Pipedrive with dev environment junk.
 */
export function createPipedriveContactEnabled(): boolean {
  return process.env.CREATE_PIPEDRIVE_CONTACT === "true"
}

export function isGroundTruthUpdateEmailsEnabled(): boolean {
  return process.env.GROUND_TRUTH_UPDATE_EMAILS_ENABLED === "true"
}

export function isVerifiedLabelEnabled(): boolean {
  return process.env.VERIFIED_LABEL_ENABLED === "true"
}

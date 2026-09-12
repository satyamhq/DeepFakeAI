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
      try {
        await db.user.upsert({
          where: { id: user.id },
          create: { id: user.id, email: user.email || `${user.id}@user.deepfakeai.org` },
          update: { email: user.email || `${user.id}@user.deepfakeai.org` },
        })
      } catch {
        // Non-blocking sync
      }
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
  if (!userId) return new Role(0, "", "")
  try {
    const user = await db.user.findUnique({ where: { id: userId } })
    if (user?.email) {
      return getRoleByIdEmail(userId, user.email)
    }
    const { supabaseAdmin } = await import("./db")
    if (supabaseAdmin) {
      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId)
      if (authData?.user?.email) {
        try {
          await db.user.upsert({
            where: { id: userId },
            create: { id: userId, email: authData.user.email },
            update: { email: authData.user.email },
          })
        } catch (upsertErr: any) {
          console.warn(`[getRoleByUserId] Notice syncing user [userId=${userId}]:`, upsertErr?.message || upsertErr)
        }
        return getRoleByIdEmail(userId, authData.user.email)
      }
    }
    return getRoleByIdEmail(userId, undefined)
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

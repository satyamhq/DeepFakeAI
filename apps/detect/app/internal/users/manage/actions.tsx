"use server"

import { createPipedriveContactEnabled, db } from "../../../server"
import { Prisma } from "../../../types/db"
import { clerkClient, currentUser } from "../../../mockClerkServer"

type ErrorCase = {
  type: "error"
  message: string
}

export type InviteResponse = ErrorCase | { type: "invited"; id: string; email: string }

export async function inviteUser(emailAddress: string): Promise<InviteResponse> {
  try {
    const clerkInvitation = await clerkClient().invitations.createInvitation({ emailAddress })
    return { type: "invited", id: clerkInvitation.id, email: emailAddress }
  } catch (e: any) {
    const message = `Failed to send invitation. ${e?.errors[0]?.longMessage}`
    console.warn(message)
    console.warn(e)
    return { type: "error", message }
  }
}

type WelcomeResponse = ErrorCase | { type: "updated"; id: string }
export async function onboardNewUser({ org, agreedTerms, emailConsent }: UserPublicMetadata): Promise<WelcomeResponse> {
  const user = await currentUser()
  if (!user)
    return {
      type: "error",
      message: "User undefined or null",
    }
  try {
    const email = user.primaryEmailAddress?.emailAddress

    if (!email) {
      throw new Error("user is missing primary email address")
    }

    let externalId = user.externalId || undefined
    if (!user.externalId) {
      try {
        // The user may not exist if they have not accepted the terms
        const userRecord = await db.user.create({
          data: {
            // TODO: Remove email from Users schema
            email,
          },
        })
        externalId = userRecord.id
      } catch (e: any) {
        console.warn("[Users] Notice creating user record (may already exist):", e?.message || e)
      }
    }

    if (createPipedriveContactEnabled()) {
      createPipedriveContact({
        id: user.id,
        email,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        org,
        emailStatus: emailConsent ? "subscribed" : "unsubscribed",
      })
    }

    const updatedClerkUser = await (clerkClient().users as any).updateUser(user.id, {
      externalId,
      publicMetadata: { agreedTerms, emailConsent, org },
    })
    return {
      type: "updated",
      id: updatedClerkUser.id,
    }
  } catch (e) {
    console.error(`Caught error onboarding user [id=${user.id}]`, e)
    return {
      type: "error",
      message: `error onboarding user [id=${user.id}]: ${e}`,
    }
  }
}
type PipedriveContactParams = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  org?: string
  emailStatus: "subscribed" | "unsubscribed"
}

const WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/18681497/2ty69yl/"

async function createPipedriveContact(contact: PipedriveContactParams): Promise<void> {
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contact),
    })
  } catch (e) {
    console.error("Error posting to Zapier", e)
  }
}

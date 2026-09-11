"use server"

import { clerkClient } from "@clerk/nextjs/server"
import { db, getServerRole } from "../../server"
import { isCuid } from "../../auth"

type ErrorCase = {
  type: "error"
  message: string
}

export type ClerkDeleteResponse = ErrorCase | { type: "deleted"; id: string; externalId: string }
export type DeleteResponse = ErrorCase | { type: "deleted"; id: string }

export async function deleteClerkUser(id: string, externalId: string | null): Promise<ClerkDeleteResponse> {
  const role = await getServerRole()
  if (!role.admin) return { type: "error", message: "Not allowed." }

  console.log(`Deleting user [admin=${role.email}, id=${id}, externalId=${externalId}]`)
  try {
    const deletedUser = await clerkClient().users.deleteUser(id)
    let maybeExternalId = ""
    if (externalId) {
      const deletedDbUser = await db.user.delete({ where: { id: externalId } })
      maybeExternalId = deletedDbUser.id
    }
    return { type: "deleted", id: deletedUser.id, externalId: maybeExternalId }
  } catch (e: any) {
    return { type: "error", message: e?.message }
  }
}

type GetClerkUsersParams = {
  q?: string
  skip?: number
}

export async function getClerkUsers({ q, skip }: GetClerkUsersParams) {
  const offset = skip
  const limit = 15

  // HACK: the `query` param doesn't search externalIds, so if the request resembles an
  // externalId (e.g. a CUID), pop that value into `externalId` instead.
  const queryObj = q && isCuid(q) ? { externalId: [q] } : { query: q }
  const response = await clerkClient().users.getUserList({ ...queryObj, offset, limit, orderBy: "-created_at" })
  return { data: response.data, totalCount: response.totalCount }
}

export async function banUser(id: string) {
  const role = await getServerRole()
  if (!role.admin) return { type: "error", message: "Not allowed." }

  try {
    await clerkClient().users.banUser(id)
    return { type: "banned", id }
  } catch (e: any) {
    return { type: "error", message: e?.message }
  }
}

export async function unbanUser(id: string) {
  const role = await getServerRole()
  if (!role.admin) return { type: "error", message: "Not allowed." }

  try {
    await clerkClient().users.unbanUser(id)
    return { type: "banned", id }
  } catch (e: any) {
    return { type: "error", message: e?.message }
  }
}

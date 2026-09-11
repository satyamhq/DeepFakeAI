"use server"

import { clerkClient } from "@clerk/nextjs/server"

export async function getUserMembershipCount(userId: string) {
  const memberships = await clerkClient().users.getOrganizationMembershipList({ userId })
  if (!memberships || memberships.data.length < 1) return 0
  return memberships.totalCount
}

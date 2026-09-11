"use server"

import { clerkClient } from "@clerk/nextjs/server"
import { db } from "../../db"

export default async function attributeUserQueriesToOrg(userId: string, orgId: string) {
  const memberships = await clerkClient().users.getOrganizationMembershipList({ userId })
  if (memberships.totalCount > 1) {
    const msg = `ClerkOrgMemberCreatedWebhook user has created more than 1 organization. Do not attribute user queries to the new org. [orgId=${orgId}, userId=${userId}, memberships=${memberships.totalCount}]`
    console.info(msg)
    return { count: 0 }
  }

  const user = await clerkClient().users.getUser(userId)
  const dbId = user.externalId
  if (!dbId) {
    const msg = `ClerkOrgMemberCreatedWebhook user hasn't completed sign up. No queries to attribute. [userId=${userId}, dbId=${dbId}]`
    console.info(msg)
    return { count: 0 }
  }

  const queries = await db.query.updateMany({ where: { userId: dbId, orgId: null }, data: { orgId } })
  console.info(
    `ClerkOrgMemberCreatedWebhook [orgId=${orgId}, userId=${userId}, dbId=${dbId}, queries=${queries.count}]`,
  )
  return { count: queries.count }
}

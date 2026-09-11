import { NextRequest } from "next/server"
import { Webhook } from "svix"

import { clerkOrgCreatedWebhookSecret } from "../../server"
import { response } from "../util"
import attributeUserQueriesToOrg from "./actions"

type OrgMemberCreatedMessage = {
  data: {
    id: string // like 'orgmem_29w9IptNja3mP8GDXpquBwN2qR9'
    organization: {
      id: string // like 'org_29w9IfBrPmcpi0IeBVaKtA7R94W'
    }
    public_user_data: {
      user_id: string // like 'user_29w83sxmDNGwOuEthce5gg56FcC'
    }
  }
  object: string
  type: string // like 'organizationMembership.created'
}

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const svix_id = req.headers.get("svix-id") ?? ""
  const svix_timestamp = req.headers.get("svix-timestamp") ?? ""
  const svix_signature = req.headers.get("svix-signature") ?? ""

  const body = await req.text()
  const sivx = new Webhook(clerkOrgCreatedWebhookSecret())

  let msg: OrgMemberCreatedMessage
  try {
    msg = sivx.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as OrgMemberCreatedMessage
  } catch (err) {
    console.error("ClerkOrgMemberCreatedWebhook error", err)
    return response.make(400, "Bad Request")
  }

  if (msg.type !== "organizationMembership.created") {
    console.error(
      `ClerkOrgMemberCreatedWebhook msg.type type was not 'organizationMembership.created' [msg.type=${msg.type}]`,
    )
    return response.make(400, "Bad Request")
  }

  const userId = msg.data.public_user_data.user_id
  const orgId = msg.data.organization.id

  try {
    await attributeUserQueriesToOrg(userId, orgId)
  } catch (e) {
    return response.make(500, `Internal error [error=${e}]`)
  }
  return response.make(200, "OK")
}

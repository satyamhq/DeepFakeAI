"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import { db, getServerRole } from "../../server"
import { batchUploadJob } from "./schedulerJobs"
import { roleAllowedToBatchUpload } from "./util"
import * as Slack from "../../utils/Slack"

export async function allowedToBatchUpload(): Promise<boolean> {
  const role = await getServerRole()
  return roleAllowedToBatchUpload({ role })
}

export async function getBatches() {
  if (!(await allowedToBatchUpload())) {
    return { type: "error" as const, message: "Not allowed." }
  }
  const role = await getServerRole()
  const orgId = auth().sessionClaims?.org_id
  const userId = role.id

  const batches = await db.batchUpload.findMany({
    where: {
      userId,
      orgId,
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          items: true,
        },
      },
    },
    take: 10,
  })
  return {
    type: "success" as const,
    batches: batches.map((batch) => ({
      id: batch.id,
      createdAt: batch.createdAt.toISOString(),
      itemCount: batch._count.items,
    })),
  }
}

export async function submitBatch(urls: string[]): Promise<
  | { type: "success"; batchId: string }
  | {
      type: "error"
      message: string
    }
> {
  if (!(await allowedToBatchUpload())) {
    return { type: "error", message: "Not allowed." }
  }
  const role = await getServerRole()
  const orgId = auth().sessionClaims?.org_id
  const clerkUserId = auth().userId
  const userId = role.id
  const user = clerkUserId ? await clerkClient().users.getUser(clerkUserId) : null

  const batch = await db.batchUpload.create({
    data: {
      userId,
      orgId,
      items: {
        createMany: {
          data: urls.map((url) => ({ postUrl: url })),
        },
      },
    },
  })
  await batchUploadJob.schedule({ priority: "live", json: { batchUploadId: batch.id } })
  const slackMessage = `⬆️ Batch upload of ${urls.length} items submitted by ${user?.fullName} (${user?.emailAddresses[0].emailAddress})`
  await Slack.postMessage(Slack.CHANNEL_SLACK_BATCH_NOTIFY, slackMessage)
  return { type: "success", batchId: batch.id }
}

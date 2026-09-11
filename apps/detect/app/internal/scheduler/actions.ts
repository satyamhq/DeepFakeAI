"use server"

import type { SchedulerConfigData } from "@truemedia/scheduler/schemas"
import { getServerRole } from "../../server"
import { getSchedulerClient } from "../../services/scheduler"

export async function updateSchedulerConfig(newConfig: SchedulerConfigData) {
  const role = await getServerRole()
  if (!role.admin) {
    return { message: "You are not authorized to modify the scheduler config" }
  }
  const client = getSchedulerClient()
  if (!client) {
    return { message: "Scheduler not setup in this environment" }
  }
  try {
    return { updated: await client.setConfiguration.mutate({ newConfig }), message: "Configuration updated" }
  } catch (e) {
    return { message: e instanceof Error ? e.message : "An error occurred" }
  }
}

export async function retryFailedMessages(input: { processor: string; messageIds?: string[] }) {
  const role = await getServerRole()
  if (!role.admin) {
    return { message: `You are not authorized to retry failed messages`, response: null }
  }
  await getSchedulerClient().retryFailedMessages.mutate(input)
  return { message: `Retry requested` }
}

export async function deleteFailedMessages(input: { processor: string; messageIds: string[] }) {
  const role = await getServerRole()
  if (!role.admin) {
    return { message: `You are not authorized to delete failed messages`, response: null }
  }
  const result = await getSchedulerClient().deleteFailedMessages.mutate(input)
  return { message: `Deleted ${result.numDeleted} messages` }
}

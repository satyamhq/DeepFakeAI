import * as Slack from "../../utils/Slack"

import { db } from "../../server"
import { response } from "../util"

// prevent pre-rendering of this route
export const dynamic = "force-dynamic"

const MIN_USERS_PER_HOUR_TO_ALERT = 10

export async function GET() {
  const userCounts = await db.user.count({
    where: {
      createdAt: {
        // last hour
        gte: new Date(Date.now() - 1000 * 60),
      },
    },
  })

  if (userCounts >= MIN_USERS_PER_HOUR_TO_ALERT) {
    const message = `High user signups detected: ${userCounts} users in the last hour. See <#C07HRMU1754> for more info.`
    console.warn(message)
    await Slack.postMessage(Slack.CHANNEL_ENG_WARNINGS, message)
  }

  return response.make(200, {})
}

"use server"

import * as Slack from "../utils/Slack"

import { db } from "../server"
import { getCurrentWindowStart, throttleLimitForUserType } from "./windowing"
import { UserType } from "@prisma/client"
import { isGateEnabled } from "../gating"
import { auth as clerkAuth } from "@clerk/nextjs/server"

export async function checkIsCurrentUserThrottled(userType: UserType): Promise<boolean> {
  return checkIsThrottled(clerkAuth().sessionClaims?.externalId, userType)
}

/**
 * Check if we're currently throttled.
 * @returns true if we're throttled and should not allow any more requests.
 */
export async function checkIsThrottled(userId: string | undefined, userType: UserType): Promise<boolean> {
  // find out how many requests we've had in the throttle window
  const throttleWindowStart = getCurrentWindowStart()

  // Only count media toward the throttles once analysis begins.
  // At that point, there will be at least 1 record with that media ID in the analysis_results table.
  // The throttle query is counting the number of media IDs associated with the given userType that
  // have been added to analysis_results within the current throttle window.
  const count = (
    await db.$queryRaw<{ count: bigint }[]>`
  SELECT COUNT(am.media_id) AS count 
  FROM (SELECT DISTINCT media_id FROM analysis_results) AS am 
  JOIN media m ON am.media_id = m.id
  JOIN media_throttle mt ON m.id = mt.media_id
  WHERE m.resolved_at >= ${throttleWindowStart}
  AND mt.user_type = ${userType}::"UserType";
  `
  )[0].count

  const isThrottled = count >= throttleLimitForUserType(userType)
  if (isThrottled) {
    if (userId != null && (await isGateEnabled("no-api-throttling", userId))) {
      return false
    }
    const text = `GlobalThrottle [userType=${userType}, isThrottled=${isThrottled}, count=${count}]`
    await Slack.postMessage(Slack.CHANNEL_ENG_ALERTS_THROTTLE, text)
  }
  return isThrottled
}

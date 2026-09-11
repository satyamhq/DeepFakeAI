import { db } from "../server"
import { checkRate } from "./util"
import { isGateEnabled } from "../gating"

/** Checks and updates a rate limit for `userId`.
 * @param action identifies the rate-limited action being taken. Each action is rate limited separately.
 * @param requests the number of allowed requests in the period.
 * @param durationSeconds the length of the period, in seconds.
 * @return `true` if the action is allowed (and was recorded), `false` if the rate limit is exceeded.
 */
export async function checkRateLimit({
  userId,
  action,
  requests,
  durationSeconds,
}: {
  userId: string
  action: string
  requests: number
  durationSeconds: number
}) {
  if (await isGateEnabled("no-api-throttling", userId)) {
    return true
  }
  const key = { userId_action: { userId, action } }
  const row = await db.rateLimit.findUnique({ where: key })
  const otimes = row ? row.times : []
  const now = Math.floor(Date.now() / 1000)
  // TODO: rewrite this to not have a race condition when we try to update
  // the `times` field multiple times in parallel.
  const times = checkRate(now, otimes, requests, durationSeconds)
  if (times) {
    await db.rateLimit.upsert({
      where: key,
      create: { userId, action, times },
      update: { times },
    })
    return true
  }
  console.log(
    `Disallowing rate-limited request [user=${userId}, action=${action}, times=${otimes.map((tt) => now - tt)}]`,
  )
  return false
}

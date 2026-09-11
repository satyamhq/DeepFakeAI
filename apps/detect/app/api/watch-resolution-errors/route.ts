import * as Slack from "../../utils/Slack"

import { db } from "../../server"
import { response } from "../util"
import { determineSourcePlatform } from "../source"
import { MediaPublisher } from "@prisma/client"

// prevent pre-rendering of this route
export const dynamic = "force-dynamic"

// if a provider has more than this error rate, we should alarm
const errorRateAlertThreshold = 0.5

// minimum number of total requests to alert, help reduce noise from
// a single request erroring out for instance
const minRequestsToAlert = 4

const checkIntervalHours = 1

export async function GET() {
  // Unfortunately prisma doesn't support joining on these 'weak' relations as it calls them
  // so we have to go back to raw sql :fist_shake: https://github.com/prisma/prisma/issues/7351
  const rawRows: { url: string; resolved: boolean; time: any }[] =
    await db.$queryRaw`select q.post_url as url, max(media_id) is not null as resolved, max(q.time) as time from queries q left join post_media p on q.post_url = p.post_url where q.time > now() - interval '24 hours' group by q.post_url`

  const groupedBySource: Record<string, { resolvedUrls: string[]; unresolvedUrls: string[]; mostRecentError?: Date }> =
    {}

  // group queries by source
  rawRows.forEach((row) => {
    const source = determineSourcePlatform(row.url)
    // // ignore unknown sources for now
    if (source === MediaPublisher.UNKNOWN) {
      return
    }

    const group = groupedBySource[source] || (groupedBySource[source] = { resolvedUrls: [], unresolvedUrls: [] })
    if (row.resolved) {
      group.resolvedUrls.push(row.url)
    } else {
      group.unresolvedUrls.push(row.url)
      const parsedTime = new Date(row.time)
      group.mostRecentError = group.mostRecentError
        ? parsedTime > group.mostRecentError
          ? parsedTime
          : group.mostRecentError
        : parsedTime
    }
  })

  // for each source, see if the error rate is too high and if so alarm
  Object.entries(groupedBySource).forEach(async ([source, grouped]) => {
    const totalRequests = grouped.resolvedUrls.length + grouped.unresolvedUrls.length
    const errorRate = grouped.unresolvedUrls.length / (totalRequests + Number.MIN_VALUE) // divide by zero guard

    const errorRateTooHigh = errorRate > errorRateAlertThreshold
    const enoughRequests = totalRequests > minRequestsToAlert
    // to avoid spamming over and and over again, only alert if the most recent query was within our cron interval (1h)
    const recentEnough =
      grouped.mostRecentError && grouped.mostRecentError > new Date(Date.now() - 1000 * 60 * 60 * checkIntervalHours)
    const expectedSourcesWithErrors = [MediaPublisher.YOUTUBE] as string[]
    if (errorRateTooHigh && enoughRequests && recentEnough && !expectedSourcesWithErrors.includes(source)) {
      const failedUrls = grouped.unresolvedUrls.slice(0, 3).join(", ")
      const message = `Source [${source}] has high resolution failure rate: ${(errorRate * 100.0).toFixed(1)}% with ${grouped.unresolvedUrls.length} errors, ${grouped.resolvedUrls.length} complete in the last 24 hours.\nSome example urls that failed to resolve are: ${failedUrls}`
      console.warn(message)
      await Slack.postMessage(Slack.CHANNEL_ENG_WARNINGS, message)
    }
  })

  return response.make(200, {})
}

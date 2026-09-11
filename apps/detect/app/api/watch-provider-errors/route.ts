import * as Slack from "../../utils/Slack"

import { db } from "../../server"
import { response } from "../util"
import { defaultPolicies } from "../../internal/metrics"
import { MediaType } from "../../data/media"

// prevent pre-rendering of this route
export const dynamic = "force-dynamic"

// if a provider has more than this error rate, we should alarm
const errorRateAlertThreshold = 0.5

// minimum number of total requests to alert, help reduce noise from
// a single request erroring out for instance
const minRequestsToAlert = 5

const hoursAgo = 24

export async function GET() {
  const activeProviders = getActiveProviders()
  const dateFilter = { created: { gte: new Date(Date.now() - 1000 * 60 * 60 * hoursAgo) } }

  const providerCounts = await db.analysisResult.groupBy({
    by: ["source", "requestState"],
    _count: { _all: true },
    where: dateFilter,
  })

  // group all these numbers by provider
  const countsByProvider: Record<string, { errors: number; complete: number }> = {}
  for (const provider of providerCounts) {
    const providerName = provider.source
    const providerState = provider.requestState
    const counts = countsByProvider[providerName] || (countsByProvider[providerName] = { errors: 0, complete: 0 })
    if (providerState == "COMPLETE") counts.complete = provider._count._all
    else if (providerState == "ERROR") counts.errors = provider._count._all
  }

  // for each provider, see if the error rate is too high and if so alarm
  for (const provider of Object.keys(countsByProvider)) {
    const counts = countsByProvider[provider]
    const totalRequests = counts.errors + counts.complete
    const errorRate = counts.errors / (totalRequests + Number.MIN_VALUE) // divide by zero guard
    if (errorRate > errorRateAlertThreshold && totalRequests > minRequestsToAlert) {
      const text = `Provider [${provider}] has high error rate: ${(errorRate * 100.0).toFixed(1)}% with ${counts.errors} errors, ${counts.complete} complete in the last ${hoursAgo} hours`
      console.warn(text)
      // only post to slack if this model isn't purely ignored
      if (provider in activeProviders) {
        await Slack.postMessage(Slack.CHANNEL_ENG_WARNINGS, text)
      }
    } else {
      const text = `Provider [${provider}] has low error rate: ${(errorRate * 100.0).toFixed(1)}% with ${counts.errors} errors, ${counts.complete} complete`
      console.info(text)
    }
  }

  return response.make(200, {})
}

/**
 * Get the set of providers that are not purely ignored
 */
function getActiveProviders() {
  const activeProviders = new Set<string>()
  ;(["video", "image", "audio", "unknown"] as const).forEach((type: MediaType) => {
    Object.entries(defaultPolicies(type))
      .filter(([, policy]) => policy !== "ignore")
      .forEach(([id]) => activeProviders.add(id))
  })
  return activeProviders
}

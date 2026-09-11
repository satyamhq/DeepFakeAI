import { MediaType } from "../../data/media"
import { AggStats, MediaMetrics, Policies, defaultPolicies, explorePolicies } from "../metrics"
import { MediaSummary } from "../summarize"

export type Optimized = { policies: Policies; stats: AggStats }
export type Results = {
  accuracy: Optimized
  f1: Optimized
  precision: Optimized
  recall: Optimized
}

addEventListener("message", (event) => {
  const type = event.data.type as MediaType
  const msums = event.data.msums as MediaSummary[]

  // first quickly enumerate thte total number of policy variants
  let total = 0
  explorePolicies(type, () => {
    total += 1
  })

  const metrics = new MediaMetrics(type, defaultPolicies(type))
  const agg = metrics.aggregate
  const start = () => ({ policies: metrics.policies, stats: agg.aggStats })
  const results = { accuracy: start(), f1: start(), precision: start(), recall: start() }
  let count = 0
  explorePolicies(type, (pp) => {
    metrics.policies = pp
    metrics.reset()
    // console.log("Checking ", Object.values(pp).map(p => p[1]).join(""))
    for (const ms of msums) {
      if (ms.type == type) metrics.note(ms)
    }
    if (results.accuracy.stats.accuracy < agg.accuracy) {
      results.accuracy.policies = { ...pp }
      results.accuracy.stats = agg.aggStats
    }
    if (results.f1.stats.f1 < agg.f1) {
      results.f1.policies = { ...pp }
      results.f1.stats = agg.aggStats
    }
    if (results.precision.stats.precision < agg.precision) {
      results.precision.policies = { ...pp }
      results.precision.stats = agg.aggStats
    }
    if (results.recall.stats.recall < agg.recall) {
      results.recall.policies = { ...pp }
      results.recall.stats = agg.aggStats
    }
    count += 1
    if (count % 1000 == 0) postMessage({ progress: count / total })
  })

  postMessage(results)
  close()
})

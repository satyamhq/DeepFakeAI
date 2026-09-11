import { setTimeout } from "timers/promises"
import { Rerun, RequestState } from "@prisma/client"
import { db } from "../../server"
import { processors } from "../../model-processors/all"
import { fetchSingleProgress } from "../../services/mediares"
import { starters } from "../starters/all"
import type { StarterId } from "../starters/types"
import { mediaType, mkTrack } from "../../data/media"
import { response } from "../util"
import { loadMedia } from "./actions"
import { ApiAuthInfo } from "../apiKey"
import { Processor } from "../../data/model"

// Make sure Vercel doesn't cache the results of our cronjob, lol.
export const dynamic = "force-dynamic"

// Extend the max runtime for this script so that it can grind through a few reruns on each invocation.
export const maxDuration = 300

const isActive = (state: RequestState | null) => state == "UPLOADING" || state == "PROCESSING"

const maxAnalysisTime = 120

async function processRerun(rerun: Rerun, status: { sources: Record<string, any> }, apiAuthInfo: ApiAuthInfo) {
  const proc = processors[rerun.source]
  if (!proc) {
    console.warn(`Rerun configured with unknown processor: ${rerun.source} (${rerun.id})`)
    return
  }
  const { matchedIds, incomplete } = await loadMedia({
    proc,
    keywords: rerun.keywords,
    mediaId: rerun.mediaId,
    dateRange: { from: rerun.fromDate ?? undefined, to: rerun.toDate ?? undefined },
    started: rerun.started,
    includeUnknown: rerun.includeUnknown,
    onlyErrors: rerun.onlyErrors,
    leewayDays: rerun.leewayDays,
  })

  // if we are already at the max parallel analyses for this source, then we can't start any more
  const pending = incomplete.filter((mm) => isActive(mm.requestState))
  const maxStartable = proc.maxPending > 0 ? Math.max(proc.maxPending - pending.length, 0) : -1
  if (maxStartable == 0) {
    const pendingIDs = pending.map((pend) => pend.mediaId)
    console.log(
      `Skipping busy rerun: ${rerun.source}/${rerun.id} [matched=${matchedIds.length}, pending=${pending.length}, startable=${maxStartable}, pendingIDs=${pendingIDs}]`,
    )
    return
  }

  // if there are no incomplete entries, then this rerun is complete
  if (incomplete.length == 0) {
    await finalizeRerun(rerun, proc, matchedIds)
    return
  }

  console.log(
    `Processing rerun: ${rerun.source}/${rerun.id} [matched=${matchedIds.length},`,
    `incomplete=${incomplete.length}, pending=${pending.length}, startable=${maxStartable}, someIncompleteIds=${incomplete.map((mm) => mm.mediaId).slice(0, 10)}]`,
  )

  // start (or run) new analysis jobs up to the max allowed jobs
  const startTime = Date.now()
  let started = 0
  let completeCount = matchedIds.length - incomplete.length
  for (const mm of incomplete) {
    if (isActive(mm.requestState)) {
      console.info(`Skipping pending media [id=${mm.mediaId}, state=${mm.requestState}]`)
      continue
    }

    // figure out if we mean to analyze the main media or the audio track
    let mediaFile = mm.mediaId
    let mimeType = mm.mimeType
    const type = mediaType(mm.mimeType)
    if (proc.mediaType !== type) {
      // check if we mean to analyze the audio track of a video
      if (mm.audioId && mm.audioMimeType && proc.mediaType === "audio") {
        mediaFile = mm.audioId
        mimeType = mm.audioMimeType
      } else {
        console.warn(`Skipping mismatched media [id=${mm.mediaId}, audioId=${mm.audioId}]`)
        continue
      }
    }

    // resolve the media URL (mediaFile is either the media id or the audio id and hence what we want here)
    const prsp = await fetchSingleProgress(mediaFile)
    if (prsp.result == "failure") {
      console.warn(`Failed to resolve media URL [id=${mm.mediaId}, file=${mediaFile}, error=${prsp.reason}]`)
      continue
    }
    if (!prsp.url) {
      console.warn(`Got no media URL for  [id=${mm.mediaId}, file=${mediaFile}]`)
      continue
    }
    const mediaUrl = prsp.url

    console.log(`Reanalyzing media [source=${rerun.source}, id=${mm.mediaId}, file=${mediaFile}]`)

    const starter = starters[rerun.source as StarterId]
    if (!starter) console.warn(`Unknown source: ${rerun.source}`)
    else {
      try {
        started += 1
        // In general a rerun should not start any new jobs, so the fake user id we're passing in here will mostly be
        // ignored. If a rerun _does_ start new jobs, it's probably because were testing some new API endpoint and
        // it's fine that those analysis jobs are not attributed to a particular user.
        const rsp = await starter(mkTrack(mimeType, mm.mediaId, mediaFile, mediaUrl), "rerun", "low", apiAuthInfo)
        if (rsp.state == RequestState.ERROR) {
          console.warn(`Analysis rerun failed [id=${mm.mediaId}, json=${rsp.error}]`)
          // wait 5 seconds before starting the next analysis for this provider, in case they're overloaded
          await setTimeout(5000)
        } else if (rsp.state == RequestState.COMPLETE) {
          // if this is a synchronous analysis, note that another media is complete
          if (proc.maxPending == 0) completeCount += 1
        }
      } catch (e) {
        console.warn(`Failed to start analysis [id=${mm.mediaId}]`, e)
      }
    }

    // if we have a limit on how many we can start, stop when we reach it
    if (maxStartable > 0 && started >= maxStartable) break

    // otherwise try to be more sophisticated: compute the average time each analysis has been taking so far, if now
    // plus the average time is less than our 2.5 minute time limit, go ahead and do another query
    const totalSecs = (Date.now() - startTime) / 1000
    const remainSecs = maxAnalysisTime - totalSecs
    const averageSecs = totalSecs / started
    if (averageSecs > remainSecs) break
    console.log(
      `Have time for another analysis [total=${totalSecs.toFixed(0)}, remain=${remainSecs.toFixed(1)}, ` +
        `average=${averageSecs.toFixed(1)}]`,
    )
  }

  status.sources[rerun.source] = {
    matched: matchedIds.length,
    incomplete: incomplete.length,
    pending: pending.length,
    complete: completeCount,
  }

  console.log(
    `Updating rerun status: ${rerun.source}/${rerun.id} [matched=${matchedIds.length}, complete=${completeCount}]`,
  )

  await db.rerun.updateMany({
    where: { id: rerun.id },
    data: { complete: completeCount },
  })
}

async function finalizeRerun(rerun: Rerun, proc: Processor<any>, matchedIds: string[]) {
  console.log(`Finalizing rerun ${rerun.source}/${rerun.id} [count=${matchedIds.length}]`)

  // update the cached score values for all the affected media, in batches of 500
  const take = 500
  for (let i = 0; i < matchedIds.length; i += take) {
    const mediaIdTakeSet = matchedIds.slice(i, i + take)
    const analyses = await db.analysisResult.findMany({
      where: {
        mediaId: { in: mediaIdTakeSet },
        source: rerun.source,
      },
    })

    for (const analysis of analyses) {
      if (analysis.requestState !== "COMPLETE") {
        console.log(`Skipping failed result [id=${analysis.mediaId}, state=${analysis.requestState}]`)
        continue
      }

      const data = JSON.parse(analysis.json)
      const error = proc.check && proc.check(data)
      if (error) {
        console.log(`Skipping error result [id=${analysis.mediaId}, error=${error}]`)
        continue
      }

      const mrs = proc.adapt(data)
      for (const mr of mrs) {
        const value = JSON.stringify(mr)
        await db.$queryRaw`update media set results[${mr.modelId}] = ${value}::jsonb where id = ${analysis.mediaId} and results != '{}'`
      }
    }
  }

  // and mark the rerun as complete
  await db.rerun.updateMany({
    where: { id: rerun.id },
    data: { completed: new Date() },
  })
}

export async function GET() {
  // TODO: set CRON_SECRET and check the Authorization header
  const apiAuthInfo: ApiAuthInfo = {
    success: false,
    publicReason: "Not authenticated",
    privateReason: "/api/process-reruns has no authentication mechanism at all",
  }
  // load up info on all active reruns
  const active = await db.rerun.findMany({ where: { completed: null } })

  const sources = new Set<string>()
  const pending: Promise<any>[] = []
  const status = { running: 0, sources: {} as any }
  for (const rerun of active) {
    // we can only process one rerun at a time for a given source
    if (sources.has(rerun.source)) continue
    sources.add(rerun.source)
    pending.push(processRerun(rerun, status, apiAuthInfo))
    status.running += 1
  }
  await Promise.all(pending)

  return response.make(200, status)
}

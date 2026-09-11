import { AnalysisResult, Media, RequestState, UserType } from "@prisma/client"
import { db } from "../../server"
import {
  CachedResult,
  CachedResults,
  ManipulationModelInfo,
  ModelInfo,
  Processor,
  cachedResultsEqual,
  isEnabled,
  mkDuration,
  modelPolicy,
} from "../../data/model"
import { MediaTrack, MediaType, mkTrack } from "../../data/media"
import { fetchMediaProgress } from "../../services/mediares"
import {
  ModelId,
  getApplicableProcessors,
  models,
  processors,
  externalManipulationModelIds,
  ManipulationModelId,
} from "../../model-processors/all"
import { starters, checkers } from "../starters/all"
import type { Starter } from "../starters/types"
import { checkIsThrottled } from "../../throttle/actions"
import { QueuePriority } from "@truemedia/scheduler/schemas"
import { ApiAuthInfo } from "../apiKey"
import { rootLogger } from "../../logging"
import { Logger } from "pino"

type MediaInfo = { cached: CachedResults; pending: string[]; errors: string[]; analysisTime: number }

function addResults<API>(info: MediaInfo, proc: Processor<API>, data: API, duration: number) {
  const error = proc.check && proc.check(data)
  if (error) info.errors.push(error)
  else {
    info.analysisTime = Math.max(info.analysisTime, duration)
    try {
      for (const mr of proc.adapt(data)) {
        const { modelId, ...cached } = mr
        info.cached[modelId] = cached
      }
    } catch (e) {
      console.warn(`Failed to adapt results [proc=${proc.id}]`, data)
      console.warn(e)
    }
  }
}

type Startable = { proc: Processor<any>; track: MediaTrack }
export type ResultsInfo = MediaInfo & { mtrack: MediaTrack; atrack: MediaTrack | null; tostart: Startable[] }

/** Checks the status of the supplied `results`. For polling analysis sources, this may involve polling the provider to
 * see if the results are completed (in which case the updated results will be stored in the database). This will not
 * start _new_ analyses, but will record in `tostart` which analyses should be started, and a subsequent call to
 * `startAnalyses` (if desired) will start those analyses.
 */
export async function checkResults(
  media: Media,
  results: AnalysisResult[],
  { includeIgnoredModels, apiAuthInfo }: { includeIgnoredModels: boolean; apiAuthInfo: ApiAuthInfo },
): Promise<ResultsInfo> {
  // prepare "tracks" to be analyzed: the main media track and optionally also an audio track
  const mtrack = mkTrack(media.mimeType, media.id, media.id, "")
  const atrack = media.audioId && media.audioMimeType ? mkTrack(media.audioMimeType, media.id, media.audioId, "") : null
  const tracks = atrack ? [mtrack, atrack] : [mtrack]
  // NOTE: the tracks do not have media URLs filled in yet; startAnalyses will fill them in if needed

  // now start or check on analysis for all the processors that handle the tracks
  const info: MediaInfo = { cached: {}, pending: [], errors: [], analysisTime: 0 }
  const tostart: Startable[] = []
  for (const track of tracks) {
    for (const proc of getApplicableProcessors(track.type)) {
      const res = results.find((res) => res.source === proc.id)
      if (res) {
        const data = JSON.parse(res.json)
        switch (res.requestState) {
          case RequestState.ERROR:
          case RequestState.COMPLETE:
            addResults(info, proc, data, mkDuration(res.created, res.completed))
            break

          case RequestState.PROCESSING:
            {
              // if this partner requires polling, then check the status of this result
              const checker = checkers[proc.id as keyof typeof checkers]
              if (!checker) info.pending.push(proc.id)
              else {
                const rsp = await checker(res.requestId!, track.type, track.id, apiAuthInfo)
                if (rsp) addResults(info, proc, rsp.rsp, mkDuration(res.created, rsp.completed))
                else info.pending.push(proc.id)
              }
            }
            break

          case RequestState.UPLOADING:
            // TODO: should we just eliminate this state?
            break
        }
      }
      // if this processor is enabled, note that a new analysis job should be started
      else if (shouldStartProcessor(proc, { includeIgnoredModels })) tostart.push({ proc, track })
    }
  }

  return { ...info, mtrack, atrack, tostart }
}

/**
 * Determines whether the processor should be started, taking into account
 * whether the models using the processor are ignored.
 */
function shouldStartProcessor(
  proc: Processor<unknown>,
  { includeIgnoredModels }: { includeIgnoredModels: boolean },
): boolean {
  // processors should not be started if the processor itself is disabled
  if (!isEnabled(proc)) return false
  // if we are including ignored models, then we should start all the enabled processors
  if (includeIgnoredModels) return true
  // otherwise, we should start the processor if it has *any* models that are not ignored
  const manipulationModelsForProcessor = Object.values(models).filter(
    (model: ModelInfo): model is ManipulationModelInfo =>
      model.processor.id === proc.id && model.type === "manipulation",
  )
  const processorHasModelsThatAreNotIgnored = manipulationModelsForProcessor.some((model) => model.policy !== "ignore")
  return processorHasModelsThatAreNotIgnored
}

export async function startAnalyses(
  media: Media,
  info: ResultsInfo,
  userId: string | undefined,
  priority: QueuePriority,
  apiAuthInfo: ApiAuthInfo,
  parentLogger: Logger = rootLogger,
): Promise<number> {
  const { mtrack, atrack, tostart, pending, errors } = info
  const logger = parentLogger.child({ mediaId: media.id })
  if (tostart.length == 0) {
    logger.info({ event: "startAnalysis/noop" }, "No analyses to start")
    return 0
  }

  // first, we need to resolve the media URL(s)
  const progress = await fetchMediaProgress(media)
  let processing = tostart.length
  if (progress.result == "failure") {
    logger.warn(
      { event: "startAnalysis/failed-resolve" },
      `Failed to resolve media URLs [id=${media.id}, reason=${progress.reason}]`,
    )
    if (progress.details) console.warn(progress.details)
    errors.push(progress.reason)
  } else if (!userId) {
    // Do not start new anaylses if this request was not initiated by an authenticated user.
    for (const { proc } of tostart) pending.push(proc.id)
  } else {
    const started: Promise<void>[] = []
    const skippedAudio: string[] = []
    for (const { proc, track } of tostart) {
      const url = track == mtrack ? progress.url : track == atrack ? progress.audioUrl : undefined
      if (url) {
        track.url = url
        const starter = (starters as Record<string, Starter>)[proc.id]
        if (!starter) {
          logger.warn({ event: "startAnalysis/invalid-processor" }, `Missing starter for processor: ${proc.id}`)
          continue
        }
        const res = starter(track, userId, priority, apiAuthInfo).then((res) => {
          switch (res.state) {
            case RequestState.COMPLETE:
              logger.info(
                { event: "startAnalysis/complete", proc: proc.id },
                `Analysis started [track=${track.file}, proc=${proc.id}]`,
              )
              addResults(info, proc, res.result, res.duration)
              processing -= 1
              break
            case RequestState.ERROR:
              logger.warn(
                { event: "startAnalysis/error", proc: proc.id },
                `Failed to start analysis [track=${track.file}, proc=${proc.id}, error=${res.error}]`,
              )
              if (res.detail) console.warn(res.detail)
              errors.push(res.error)
              break
            default:
              logger.info(
                { event: "startAnalysis/pending", proc: proc.id },
                `Analysis pending [track=${track.file}, proc=${proc.id}]`,
              )
              pending.push(proc.id)
              break
          }
        })
        started.push(
          res.catch((e) => {
            logger.warn(
              { event: "startAnalysis/throw" },
              `Failed to start analysis [track=${track.file}, proc=${proc.id}]`,
              e,
            )
            errors.push(`Failed to start ${proc.id}`)
          }),
        )
      }
      // If the audio track for this media is DOA, make a note if it and we'll clean it up below.
      else if (track == atrack && progress.audioDOA) {
        logger.info(
          { event: "startAnalysis/skipped-audio" },
          `Skipping DOA audio track [id=${media.id}, track=${track.file}]`,
        )
        skippedAudio.push(proc.id)
        processing -= 1
      }
      // If a media track is still downloading, we have to wait to start processing; report its processors as pending.
      else pending.push(proc.id)
    }
    // if we determine that this media has DOA audio, remove the audio track metadata from the media record
    if (skippedAudio.length > 0) {
      logger.info(`Cleaning up DOA audio track [id=${media.id}, skipped=${skippedAudio}]`)
      await db.media.update({ where: { id: media.id }, data: { audioId: null, audioMimeType: null } })
    }
    // if we started any new analyses, we now have to wait for them
    await Promise.all(started)
  }
  return processing
}

export function shouldUpdateResults(
  media: Media,
  info: ResultsInfo,
): { shouldUpdate: true } | { shouldUpdate: false; reason: "blocking-penders" | "no-results" | "no-change" } {
  const { pending, cached } = info
  // Only count enabled processors when considering whether to wait for pending results. We may have pending
  // results from a processor that is experiencing a service outage and which we have temporarily disabled (cough cough
  // Reality Defender), and we don't want that to hold up the finalization of all media which we sent to them before we
  // realized that they were failing. So we go ahead and finalize media without their results. This means that if/when
  // these disabled processors eventually _do_ yield results, an analysis_results record will be created for that
  // processor but the results themselves will _not_ be included in the media's cached results summary. So be it. We
  // have to compromise somehow and that is the least problematic.
  const blockingPenders = pending.map((pp) => isEnabled(processors[pp])).length
  // If we have pending analyses, no results, or the results haven't changed, don't update.
  if (blockingPenders > 0) return { shouldUpdate: false, reason: "blocking-penders" }
  if (Object.keys(cached).length == 0) return { shouldUpdate: false, reason: "no-results" }
  if (cachedResultsEqual(media.results as CachedResults, cached)) return { shouldUpdate: false, reason: "no-change" }
  return { shouldUpdate: true }
}

export async function maybeUpdateResults(media: Media, info: ResultsInfo): Promise<boolean> {
  if (shouldUpdateResults(media, info).shouldUpdate) {
    await updateResults(media, info)
    return true
  }
  return false
}

export async function updateResults(media: Media, info: ResultsInfo) {
  const { cached, analysisTime } = info
  await db.media.update({ where: { id: media.id }, data: { results: cached, analysisTime } })
}

/**
 * Checks whether analyses can proceed for the given UserType.
 *
 * API users need to call /get-results on resolved media in order to start analysis,
 * so we need to make sure API users are throttled to control load. This avoids a
 * scenario where a user resolves a few thousand media items while our system isn't
 * throttled, and then tries to get results for all of them at once.
 *
 * Because users on the site will immediately resolve and get results, they will be
 * throttled by /resolve-media and can pass without performing the throttle check.
 */
export async function canStartAnalysis(userType: UserType, userId: string | undefined): Promise<boolean> {
  if (userType === UserType.API) {
    return !(await checkIsThrottled(userId, UserType.API))
  }
  return true
}

export type DecoratedResults = Record<string, DecoratedResult>

export type DecoratedResult = CachedResult & {
  analysisTime?: number
}

export function toExternal({
  type,
  cached,
  analysisResults = null,
  includeIgnoredModels,
  modelNamesMap = externalManipulationModelIds,
}: {
  type: MediaType
  cached: CachedResults
  analysisResults?: AnalysisResult[] | null
  includeIgnoredModels: boolean
  modelNamesMap?: Record<ManipulationModelId, string>
}): DecoratedResults {
  const external: DecoratedResults = {}
  for (const modelId of Object.keys(cached)) {
    const model = models[modelId as ModelId]

    // Skip sharing externally our results for auxillary models unrelated to fakeness
    if (model.type !== "manipulation") continue
    // Don't include ignored models in the API results for external users
    if (!includeIgnoredModels && modelPolicy(model, type) === "ignore") continue

    const { rank, score } = cached[modelId]
    const analysisTime = getAnalysisTime({ modelId, analysisResults })
    external[modelNamesMap[modelId]] = { rank, score, analysisTime }
  }
  return external
}

function getAnalysisTime({
  modelId,
  analysisResults,
}: {
  modelId: string
  analysisResults: AnalysisResult[] | null
}): number | undefined {
  if (!analysisResults) return undefined
  const model = models[modelId as ModelId]
  const procId = model.processor.id
  const result = analysisResults.find((rr) => rr.source == procId)
  if (!result) return undefined
  return mkDuration(result.created, result.completed)
}

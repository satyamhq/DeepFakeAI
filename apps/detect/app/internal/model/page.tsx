import { AnalysisResult, Media, MediaMetadata, RequestState } from "@prisma/client"
import { db } from "../../server"
import { mkDuration } from "../../data/model"
import { manipulationModelInfo } from "../../model-processors/all"
import { pageNav } from "../ui"
import { DateRange, MediaSummary, summarizeMedia, toYMD } from "../summarize"
import ModelPage from "./ModelPage"

export const dynamic = "force-dynamic"

export type MediaSummaryPlus = MediaSummary & {
  duration: number
  score: number // >= 0 is a score, -1 == not applicable
}

export type Error = { id: string; date: string; error: string }
export type Summary = { msums: MediaSummaryPlus[]; errors: Error[]; missing: number }

async function summarizeModel(modelId: string, dateRange: DateRange) {
  const sum: Summary = { msums: [], errors: [], missing: 0 }
  if (!modelId) return sum

  const noteError = (id: string, date: Date, error: string) => sum.errors.push({ id, date: toYMD(date), error })
  const model = manipulationModelInfo(modelId)
  if (model.mediaType == "unknown") {
    noteError("", new Date(), `Unknown model '${modelId}'`)
    return sum
  }

  const missing = "missing"
  function addResult(ar: AnalysisResult & { media: Media & { meta: MediaMetadata | null } }) {
    const mm = ar.media
    const msum = summarizeMedia(mm)
    if (!msum) return // media is still processing, skip it
    const ms: MediaSummaryPlus = { ...msum, score: -1, duration: 0 }

    try {
      if (ar.source !== proc.id) throw `Source mismatch [want=${proc.id}, got=${ar.source}]`
      if (ar.requestState == RequestState.PROCESSING) throw "Still processing"

      const data = JSON.parse(ar.json)
      if (proc.check) {
        const error = proc.check(data)
        if (error) throw error
      }

      const mrs = proc.adapt(data)
      for (const mr of mrs) {
        if (mr.modelId != modelId) continue
        // if this model reported N/A for this media, then skip it entirely
        if (mr.rank == "n/a") return
        ms.score = mr.score
      }
      if (ms.score < 0) throw missing
      // trim the scores down to just our score so we can show this summary in a compact MediaGrid
      ms.scores = { [modelId]: ms.score }

      ms.duration = mkDuration(ar.created, ar.completed)
      sum.msums.push(ms)
    } catch (e) {
      if (e === missing) sum.missing += 1
      else if (typeof e === "string") noteError(mm.id, mm.resolvedAt, e)
      else {
        console.warn(`Failed to process analysis result [id=${mm.id}]:`, e)
        noteError(mm.id, mm.resolvedAt, `${e}`)
      }
    }
  }

  const proc = model.processor
  const take = 500
  let skip = 0
  let loaded = -1
  while (loaded != 0) {
    const results = await db.analysisResult.findMany({
      where: {
        source: proc.id,
        media: {
          meta: { isNot: null },
          resolvedAt: {
            gte: dateRange.from ? new Date(dateRange.from) : undefined,
            lte: dateRange.to ? new Date(dateRange.to) : undefined,
          },
        },
      },
      include: { media: { include: { meta: true } } },
      orderBy: [{ created: "desc" }],
      skip,
      take,
    })
    for (const ar of results) addResult(ar)
    skip += results.length
    loaded = results.length
  }

  console.log(`Loaded media [model=${modelId}, summarized=${sum.msums.length}, errors=${sum.errors.length}]`)
  return sum
}

export default async function Page({ searchParams }: { searchParams: { model?: string } & DateRange }) {
  const modelId = searchParams.model ?? ""
  const dateRange = { from: searchParams.from, to: searchParams.to }

  // if no date range was set at all, default to the last two months of data
  const spKeys = Object.keys(searchParams)
  if (!spKeys.includes("from") && !spKeys.includes("to")) {
    const from = new Date()
    from.setMonth(from.getMonth() - 2)
    dateRange.from = toYMD(from)
  }

  const summary = await summarizeModel(modelId, dateRange)
  return (
    <>
      {pageNav("Model")}
      <ModelPage modelId={modelId} summary={summary} dateRange={dateRange} />
    </>
  )
}

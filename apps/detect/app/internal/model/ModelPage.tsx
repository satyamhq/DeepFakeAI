"use client"

import { useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ResponsiveBar } from "@nivo/bar"
import { Select } from "flowbite-react"
import resolveConfig from "tailwindcss/resolveConfig"
import * as tailwindConfig from "../../../tailwind.config"
import { scoreMeansFake } from "../../data/model"
import { fakeLabels, meansUnknown } from "../../data/groundTruth"
import { models, manipulationModelInfo, ManipulationModelId, isArchived } from "../../model-processors/all"
import { RadioItem, analysisLink, showText, table, radioRow } from "../ui"
import { DateRange, MediaSummary, rangeMatches } from "../summarize"
import { Stats, SingleModelEval } from "../metrics"
import { Filter } from "../filter"
import { MediaSummaryPlus, Summary } from "./page"
import EditFilter from "../components/EditFilter"
import PickDateRange from "../components/PickDateRange"
import CSVDownloadLink from "../components/CSVDownloadLink"
import useSetDateRange from "../components/useSetDateRange"
import MediaGrid from "../eval/MediaGrid"
import StatsTable from "../perf/StatsTable"

function PickModel({ url, modelId }: { url: string; modelId: string }) {
  const searchParams = useSearchParams()
  const passThrough = Array.from(searchParams.entries()).filter((ee) => ee[0] != "model")
  const modelIds = Object.keys(models)
    .filter((model) => !isArchived(model))
    .sort()
  const form = useRef<HTMLFormElement>(null)
  return (
    <form method="GET" action={url} ref={form} className="flex flex-row items-center gap-5">
      <span>Model:</span>
      <Select id="model" name="model" value={modelId} onChange={() => form.current?.requestSubmit()}>
        {!modelId && (
          <option key={"pick"} value={""}>
            Select model...
          </option>
        )}
        {modelIds.map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
      </Select>
      {passThrough.map(([key, value]) => (
        <input type="hidden" key={key} name={key} value={value} />
      ))}
    </form>
  )
}

type Distrib = {
  count: number
  min: number
  max: number
  mean: number
  stddev: number
}

function computeDistrib(values: number[]): Distrib {
  const count = values.length
  if (count == 0) return { count, min: 0, max: 0, mean: 0, stddev: 0 }

  let min = 9999999,
    max = 0,
    total = 0
  for (const v of values) {
    min = Math.min(min, v)
    max = Math.max(max, v)
    total += v
  }
  const mean = total / count
  const sumdev = values.reduce((d2s, v) => {
    const dev = v - mean
    return d2s + dev * dev
  }, 0)
  const stddev = Math.sqrt(sumdev / count)

  return { count, min, max, mean, stddev }
}

type Bucket = { x: string; count: number }
type Metrics = Distrib & {
  buckets: Bucket[]
  outliers: number
}

function durationMetrics(msums: MediaSummaryPlus[]): Metrics {
  const values = msums.map((ms) => ms.duration).filter((v) => v > 0)
  const stats = computeDistrib(values)

  // filter any values above 3 standard deviations from the mean (or one hour) and recompute stats
  const cutoff = Math.min(stats.mean + 5 * stats.stddev, 60 * 60)
  const fstats = computeDistrib(values.filter((v) => v <= cutoff))

  // use the filtered stats to compute our bucket sizes
  const bcount = 15
  const size = (fstats.mean + 2 * fstats.stddev) / bcount
  const label = (ii: number) => formatDuration(ii * size + size / 2) + (ii == bcount - 1 ? "+" : "")
  const buckets = Array.from({ length: bcount }, (_, ii) => ({ x: label(ii), count: 0 }))
  for (const v of values) {
    const bidx = Math.min(Math.floor(v / size), buckets.length - 1)
    buckets[bidx].count += 1
  }
  return { buckets, outliers: stats.count - fstats.count, ...fstats }
}

const formatScore = (score: number) => score.toFixed(2)

function scoreMetrics(msums: MediaSummaryPlus[]): Metrics {
  const values = msums.map((ms) => ms.score).filter((v) => v >= 0)
  const stats = computeDistrib(values)

  const bcount = 20,
    size = 1 / bcount
  const label = (ii: number) => formatScore(ii * size + size / 2)
  const buckets = Array.from({ length: bcount }, (_, ii) => ({ x: label(ii), count: 0 }))
  for (const v of values) {
    const bidx = Math.min(Math.floor(v / size), buckets.length - 1)
    buckets[bidx].count += 1
  }
  return { buckets, outliers: 0, ...stats }
}

const fullConfig = resolveConfig(tailwindConfig)

const nivoTheme = {
  text: {
    fill: "#FFFFFF",
  },
  labels: {
    text: {
      fill: fullConfig.theme.colors.gray[800],
    },
  },
  grid: {
    line: {
      stroke: fullConfig.theme.colors.gray[700],
    },
  },
  tooltip: {
    container: {
      background: fullConfig.theme.colors.gray[700],
    },
  },
}

const minute = 60
const hour = minute * 60
function formatDuration(seconds: number) {
  if (seconds > hour) return `${(seconds / hour).toFixed(2)}h`
  else if (seconds > minute) return `${(seconds / minute).toFixed(2)}m`
  else return `${seconds.toFixed(2)}s`
}

type WeekData = { week: string; stats: Stats; media: MediaSummaryPlus[] }

function computeWeekly(modelId: ManipulationModelId, msums: MediaSummaryPlus[], externalOnly: boolean): WeekData[] {
  const byWeek = new Map<string, MediaSummaryPlus[]>()
  for (const ms of msums) {
    let week = byWeek.get(ms.resolvedWeek)
    if (!week) byWeek.set(ms.resolvedWeek, (week = []))
    if (meansUnknown(ms.fake) || (externalOnly && !ms.external)) continue
    week.push(ms)
  }

  const weeks = Array.from(byWeek.keys())
  weeks.sort((a, b) => b.localeCompare(a))

  const weekData: WeekData[] = []
  const smeval = new SingleModelEval(modelId)
  for (const week of weeks) {
    const media = byWeek.get(week)!
    media.sort((ma, mb) => mb.resolvedDate.localeCompare(ma.resolvedDate))
    for (const ms of media) {
      if (!meansUnknown(ms.fake)) smeval.applyScore(ms.fake === "TRUE", ms.score)
    }
    weekData.push({ week, stats: smeval.stats, media })
    smeval.reset()
  }

  return weekData
}

type ExportFilter = "all" | "false" | "falsePos" | "falseNeg"
const exportToggles: RadioItem<ExportFilter>[] = [
  { id: "all", label: "All" },
  { id: "false", label: "Errors" },
  { id: "falsePos", label: "False Pos" },
  { id: "falseNeg", label: "False Neg" },
]

function ExportRow({ modelId, msums }: { modelId: string; msums: MediaSummary[] }) {
  const [exportFilter, setExportFilter] = useState<ExportFilter>("all")
  const model = manipulationModelInfo(modelId)

  const formatCsvScore = (score: number | undefined) => (score == undefined || score < 0 ? "" : score.toFixed(2))
  const pickFake = (ms: MediaSummary) => (model.mediaType == "audio" && ms.type == "video" ? ms.audioFake : ms.mainFake)
  const exportErrorCsv = () => [
    ["Id", "Audio ID", "Handle", "Keywords", "Relevant", "Ground Truth", "Model Score"],
    ...msums
      .filter((ms) => exportMatches(ms, exportFilter))
      .map((ms) => [
        ms.id,
        ms.audioId ?? "",
        `"${ms.handle}"`,
        `"${ms.keywords}"`,
        ms.experimental.join(" "),
        fakeLabels[pickFake(ms)],
        formatCsvScore(ms.scores[modelId]),
      ]),
  ]

  function exportMatches(msum: MediaSummary, filter: ExportFilter) {
    if (filter === "all") return true
    // if both video and audio are unknown, it cannot match
    if (meansUnknown(msum.mainFake) && meansUnknown(msum.audioFake)) return false
    const isFake = pickFake(msum) === "TRUE"
    const saidFake = scoreMeansFake(model, msum.scores[modelId])
    if (isFake == saidFake) return false // got it right!
    switch (filter) {
      case "false":
        return true
      case "falsePos":
        return !isFake
      case "falseNeg":
        return isFake
    }
  }

  return (
    <div className="text-lg mt-5 flex gap-5">
      Export model results:
      {radioRow(exportToggles, exportFilter, setExportFilter)}
      <CSVDownloadLink filename={`${modelId}.csv`} generateData={exportErrorCsv} />
    </div>
  )
}

export default function ModelPage({
  modelId,
  summary,
  dateRange,
}: {
  modelId: string
  summary: Summary
  dateRange: DateRange
}) {
  const [filter, setFilter] = useState(Filter.makeDefault())
  const [expandWeek, setExpandWeek] = useState("")
  const setDateRange = useSetDateRange()
  const header = (
    <div className="flex flex-row gap-5 items-end justify-center">
      <PickModel url="/internal/model" modelId={modelId} />
      <div className="grow"></div>
      <PickDateRange range={dateRange} setRange={setDateRange} />
      <EditFilter filter={filter} setFilter={setFilter} />
    </div>
  )
  if (modelId == "") return header

  const { msums, errors, missing } = summary
  const fsums = msums.filter((mm) => filter.matchesSummary(mm) && rangeMatches(dateRange, mm.resolvedDate))
  const scores = scoreMetrics(fsums)
  const duration = durationMetrics(fsums)
  const model = manipulationModelInfo(modelId)
  const weekly = computeWeekly(modelId as ManipulationModelId, fsums, false)

  const scoreGraph = fsums.length > 0 && (
    <>
      <h2 className="mt-5 text-lg">Score distribution</h2>
      <div className="h-64">
        <ResponsiveBar
          theme={nivoTheme}
          animate={false}
          indexBy="x"
          keys={["count"]}
          data={scores.buckets}
          padding={0.6}
          margin={{ top: 30, right: 50, bottom: 30, left: 50 }}
          colors={[fullConfig.theme.colors.lime[500]]}
          axisLeft={{ tickValues: 5 }}
        />
      </div>
      <div className="flex justify-center gap-5">
        <span>Count={scores.count}</span>
        <span>Min={formatScore(scores.min)}</span>
        <span>Max={formatScore(scores.max)}</span>
        <span>Mean={formatScore(scores.mean)}</span>
        <span>σ={formatScore(scores.stddev)}</span>
      </div>
    </>
  )

  const timeGraph = fsums.length > 0 && (
    <>
      <h2 className="mt-5 text-lg">Processing time distribution</h2>
      <div className="h-64">
        <ResponsiveBar
          theme={nivoTheme}
          animate={false}
          indexBy="x"
          keys={["count"]}
          data={duration.buckets}
          padding={0.6}
          margin={{ top: 30, right: 50, bottom: 30, left: 50 }}
          colors={[fullConfig.theme.colors.lime[500]]}
          axisLeft={{ tickValues: 5 }}
        />
      </div>
      <div className="flex justify-center gap-5">
        <span>Count={duration.count}</span>
        <span>Min={formatDuration(duration.min)}</span>
        <span>Max={formatDuration(duration.max)}</span>
        <span>Mean={formatDuration(duration.mean)}</span>
        <span>σ={formatDuration(duration.stddev)}</span>
        <span>Outliers={duration.outliers}</span>
      </div>
    </>
  )

  const formatWeek = (week: string) => `${week.substring(0, 4)} Week ${week.substring(4)}`
  const weekData = weekly.map((wd) => ({ id: wd.week, label: formatWeek(wd.week), stats: wd.stats }))
  const toggleExpand = (week: string) => {
    setExpandWeek(expandWeek == week ? "" : week)
  }
  const ferrors = errors.filter((ee) => rangeMatches(dateRange, ee.date))

  return (
    <>
      {header}
      {scoreGraph}
      {timeGraph}
      <ExportRow modelId={modelId} msums={fsums} />
      <h2 className="mt-5 text-lg">Weekly Performance</h2>
      <StatsTable data={weekData} toggleExpand={toggleExpand} />
      {expandWeek != "" && (
        <div className="mt-3">
          <MediaGrid
            title={`${formatWeek(expandWeek)} details`}
            type={model.mediaType}
            msums={weekly.find((ww) => ww.week == expandWeek)!.media}
            track={true}
            expanded={true}
          />
        </div>
      )}
      <h2 className="mt-5 text-lg">No results: {missing}</h2>
      <h2 className="mt-5 text-lg">Errors ({ferrors.length})</h2>
      {table(
        ferrors,
        (ee) => ee.id,
        ["Id", "Date", "Error"],
        [(ee) => analysisLink(ee.id, ee.id, "_blank"), (ee) => showText(ee.date), (ee) => showText(ee.error)],
      )}
    </>
  )
}

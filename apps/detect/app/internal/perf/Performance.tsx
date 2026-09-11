"use client"

import { useState } from "react"
import { Button, Card, TextInput } from "flowbite-react"
import { MediaType } from "../../data/media"
import { meansUnknown } from "../../data/groundTruth"
import { pageNav } from "../ui"
import { MediaSummary } from "../summarize"
import { Stats, MediaMetrics, defaultPolicies } from "../metrics"
import { Filter } from "../filter"
import EditFilter from "../components/EditFilter"
import MediaGrid from "../eval/MediaGrid"
import StatsTable from "./StatsTable"

type WeekData = { week: string; video: Stats; image: Stats; audio: Stats; unknown: Stats; media: MediaSummary[] }

function computeWeekly(msums: MediaSummary[]): WeekData[] {
  const byWeek = new Map<string, MediaSummary[]>()
  for (const ms of msums) {
    let week = byWeek.get(ms.resolvedWeek)
    if (!week) byWeek.set(ms.resolvedWeek, (week = []))
    if (meansUnknown(ms.fake) && meansUnknown(ms.audioFake)) continue
    week.push(ms)
  }

  const weeks = Array.from(byWeek.keys())
  weeks.sort((a, b) => b.localeCompare(a))

  const weekData: WeekData[] = []

  const metrics = {
    video: new MediaMetrics("video", defaultPolicies("video")),
    image: new MediaMetrics("image", defaultPolicies("image")),
    audio: new MediaMetrics("audio", defaultPolicies("audio")),
    unknown: new MediaMetrics("unknown", defaultPolicies("unknown")),
  }
  for (const week of weeks) {
    const media = byWeek.get(week)!
    for (const ms of media) {
      metrics[ms.type].note(ms)
      // cheat and apply everything to unknown also to compute a total
      if (ms.type != "unknown") metrics["unknown"].note(ms)
    }
    weekData.push({
      week,
      video: metrics.video.aggregate.stats,
      image: metrics.image.aggregate.stats,
      audio: metrics.audio.aggregate.stats,
      unknown: metrics.unknown.aggregate.stats,
      media,
    })
    metrics.video.aggregate.reset()
    metrics.audio.aggregate.reset()
    metrics.image.aggregate.reset()
    metrics.unknown.aggregate.reset()
  }

  return weekData
}

const rows = [
  { type: "video" as MediaType, label: "Video" },
  { type: "image" as MediaType, label: "Image" },
  { type: "audio" as MediaType, label: "Audio" },
  { type: "unknown" as MediaType, label: "Total" },
]

const formatWeek = (week: string) => `${week.substring(0, 4)} Week ${week.substring(4)}`

function WeekCard({ week }: { week: WeekData }) {
  const [expand, setExpand] = useState<MediaType>("unknown")
  const toggleExpand = (type: string) => setExpand(expand === type ? "unknown" : (type as MediaType))
  const data = rows.map(({ type, label }) => ({ id: type, label, stats: week[type] }))
  return (
    <Card className="mb-5">
      <h2 className="font-bold">{formatWeek(week.week)} Performance</h2>
      <StatsTable data={data} toggleExpand={toggleExpand} />
      {expand !== "unknown" && <MediaGrid type={expand} msums={week.media} track={false} expanded={true} />}
    </Card>
  )
}

export default function Performance({ msums, weeks }: { msums: MediaSummary[]; weeks: number }) {
  const [filter, setFilter] = useState(Filter.makeDefault())
  const [weeksValue, setWeeksValue] = useState(weeks)

  // Lop off the list of weeks so it only includes the first N weeks.
  // The data we receive here intentionally has more weeks than we need in order to guarantee we fill entire whole weeks.
  const weekly = computeWeekly(msums.filter((mm) => filter.matchesSummary(mm))).slice(0, weeks)
  return (
    <>
      <div className="flex flex-row gap-5 mb-5">
        {pageNav("Eval over Time")}
        <div className="grow" />
        <form className="flex flex-row items-center gap-2">
          Weeks:
          <TextInput
            name="weeks"
            type="number"
            value={weeksValue}
            step="1"
            onChange={(ev) => setWeeksValue(parseInt(ev.currentTarget.value))}
          />
          <Button color="lime" type="submit">
            Search
          </Button>
        </form>
        <EditFilter filter={filter} setFilter={setFilter} orient="horizontal" />
      </div>
      {weekly.map((ww) => (
        <WeekCard key={ww.week} week={ww} />
      ))}
    </>
  )
}

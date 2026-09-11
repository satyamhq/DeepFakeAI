"use client"

import { useState } from "react"
import { Card, Tabs } from "flowbite-react"
import { Dataset } from "@prisma/client"
import { MediaType, MediaSource } from "../../data/media"
import { Filter } from "../filter"
import { MediaSummary, DateRange, rangeMatches } from "../summarize"
import EditFilter from "../components/EditFilter"
import PickDatasets from "../components/PickDatasets"
import PickDateRange from "../components/PickDateRange"
import PickSource from "../components/PickSource"
import ModelEvals from "./ModelEvals"
import AggregateEvals from "./AggregateEvals"
import useSetDateRange from "../components/useSetDateRange"
import { useSearchParams } from "next/navigation"

export default function EvalPage({
  datasets,
  msums,
  query,
}: {
  datasets: Dataset[]
  msums: MediaSummary[]
  query: DateRange
}) {
  const params = useSearchParams()
  const activeDatasets = params.getAll("ds")
  const dateRange: DateRange = {
    from: query?.from,
    to: query?.to,
  }
  let defaultFilter = Filter.makeDefault()

  // if we don't have any search params, then configure our defaults based on the "eval" dataset and dataset group
  if (params.size == 0) {
    const evalSet = datasets.find((ds) => ds.name == "eval")
    if (evalSet) defaultFilter = Filter.make(evalSet.keywords)
  }

  const [filter, setFilter] = useState(defaultFilter)
  const setDateRange = useSetDateRange()

  const [source, setSource] = useState<MediaSource | undefined>(undefined)

  // if we have one or more datasets selected, we filter based on those
  const usingDatasets = activeDatasets.length > 0
  const filters = usingDatasets
    ? datasets.filter((ds) => activeDatasets.includes(ds.id)).map((ds) => Filter.make(ds.keywords))
    : [filter]
  msums = msums.filter(
    (mm) =>
      (source === undefined || mm.source === source) &&
      rangeMatches(dateRange, mm.resolvedDate) &&
      !!filters.find((ff) => ff.matchesSummary(mm)),
  )

  const fakeSortValue = { TRUE: 0, FALSE: 1, UNKNOWN: 2, UNREVIEWED: 3 }
  msums.sort((a, b) => {
    const fs = fakeSortValue[a.fake] - fakeSortValue[b.fake]
    if (fs != 0) return fs
    return b.resolvedDate.localeCompare(a.resolvedDate)
  })

  const counts = { video: 0, image: 0, audio: 0, unknown: 0 }
  for (const msum of msums) counts[msum.type] += 1

  const tabs = [
    { type: "video" as MediaType, label: `Video` },
    { type: "image" as MediaType, label: `Image` },
    { type: "audio" as MediaType, label: `Audio` },
  ]

  return (
    <>
      <div className="flex flex-row gap-5 items-center justify-center">
        <PickDatasets datasets={datasets} />
        <div className="grow"></div>
        <PickDateRange range={dateRange} setRange={setDateRange} />
        {!usingDatasets && <PickSource source={source} setSource={setSource} />}
        {!usingDatasets && <EditFilter filter={filter} setFilter={setFilter} />}
      </div>
      <Tabs style="fullWidth" className="mt-2 gap-0">
        {tabs.map(({ type, label }) => (
          <Tabs.Item key={type} title={`${label} models`}>
            <Card className="mb-5 border-t-0 rounded-tl-none rounded-tr-none">
              <ModelEvals type={type} label={label} msums={msums} />
            </Card>
          </Tabs.Item>
        ))}
        {tabs.map(({ type, label }) => (
          <Tabs.Item key={type} title={`${label} media`}>
            <Card className="mb-5 border-t-0 rounded-tl-none rounded-tr-none">
              <AggregateEvals type={type} msums={msums} />
            </Card>
          </Tabs.Item>
        ))}
      </Tabs>
    </>
  )
}

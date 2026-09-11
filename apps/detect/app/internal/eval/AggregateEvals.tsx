import { Fragment, useState } from "react"
import { Button, Label, Radio } from "flowbite-react"
import { MediaType } from "../../data/media"
import { ModelPolicy } from "../../data/model"
import { ModelId } from "../../model-processors/all"
import { colorize, RadioItem, radioRow } from "../ui"
import { AggStats, MediaMetrics, defaultPolicies, summarizePolicies } from "../metrics"
import { MediaSummary, audioTrackToMedia } from "../summarize"
import AggregateStats from "./AggregateStats"
import MediaGrid from "./MediaGrid"
import { Results, Optimized } from "./optimizer"

function computeDefaultMetrics(type: MediaType, msums: MediaSummary[]) {
  const defaultMetrics = new MediaMetrics(type, defaultPolicies(type))
  for (const ms of msums) {
    if (ms.type == type) defaultMetrics.note(ms)
  }
  return defaultMetrics.aggregate.aggStats
}

function ShowOptimized({ optimized, compare }: { optimized: Optimized; compare: AggStats }) {
  const { included, trusted } = summarizePolicies(optimized.policies)
  return (
    <>
      <div>Trusted: {trusted || "<none>"}</div>
      <div>Included: {included || "<none>"}</div>
      <AggregateStats algo="vote" agg={optimized.stats} compare={compare} />
      <hr className="my-3" />
    </>
  )
}

type AudioMode = "audio" | "video" | "audio_and_video"
const typeFilters: RadioItem<AudioMode>[] = [
  { id: "audio", label: "Audio media" },
  { id: "video", label: "Video audio tracks" },
  { id: "audio_and_video", label: "All audio" },
]

export default function AggregateEvals({ type, msums }: { type: MediaType; msums: MediaSummary[] }) {
  // for audio media, we allow treating video audio tracks as if they were "pure" audio media
  const [typeFilter, setTypeFilter] = useState<AudioMode>("audio_and_video")
  const [policies, setPolicies] = useState(defaultPolicies(type))
  const [working, setWorking] = useState<string | undefined>(undefined)
  const [results, setResults] = useState<Results | undefined>(undefined)

  if (typeFilter != "audio") {
    const vsums = msums
      .filter((mm) => mm.type == "video")
      .map(audioTrackToMedia)
      .filter((mm) => !!mm) as MediaSummary[]
    if (typeFilter == "video") msums = vsums
    else msums = msums.concat(vsums)
  }

  const metrics = new MediaMetrics(type, policies)
  for (const ms of msums) {
    if (ms.type == type) metrics.note(ms)
  }

  const toggleItem = (model: ModelId, policy: ModelPolicy, label: string) => (
    <div className="flex items-center gap-2 mr-6">
      <Radio
        id={`${model}.${policy}`}
        checked={policies[model] === policy}
        onChange={(v) => {
          if (v) {
            setPolicies((pp) => ({ ...pp, [model]: policy }))
          }
        }}
      />
      <Label>{label}</Label>
    </div>
  )

  const policyToggle = (model: ModelId) => (
    <Fragment key={model}>
      <span className="mr-4">{model}:</span>
      {toggleItem(model, "ignore", "Ignore")}
      {toggleItem(model, "include", "Include")}
      {toggleItem(model, "trust", "Trust")}
    </Fragment>
  )

  function startJob() {
    const worker = new Worker(new URL("./optimizer", import.meta.url))
    worker.postMessage({ type, msums })
    worker.onmessage = (event) => {
      if ("progress" in event.data) {
        const progress = event.data.progress as number
        setWorking((progress * 100).toFixed(1) + "%")
      } else {
        console.log("Got work", event.data)
        setResults(event.data as Results)
        setWorking(undefined)
      }
    }
    setWorking("0%")
  }

  // compute our metrics using the default policies so that we can show deltas from that
  const defAggStats = computeDefaultMetrics(type, msums)

  return (
    <>
      <div className="flex flex-row gap-10">
        <span>
          Total media: {metrics.fake + metrics.real} &ndash; {colorize("TRUE", metrics.fake)} fake,{" "}
          {colorize("FALSE", metrics.real)} real
        </span>
        {type === "audio" && radioRow(typeFilters, typeFilter, setTypeFilter)}
      </div>
      <div className="grid grid-cols-[1fr_1fr] gap-10">
        <div className="flex flex-col">
          <div className="font-bold">Vote-based aggregation</div>
          <AggregateStats algo="vote" agg={metrics.aggregate.aggStats} compare={defAggStats} />
          <div className="font-bold mt-5">Model vote policies</div>
          <div className="self-start grid grid-cols-[auto,1fr,1fr,1fr]">
            {metrics.models.sort().map((mm) => policyToggle(mm))}
          </div>
          <div className="flex flex-row mt-3 gap-10">
            <Button size="xs" onClick={() => setPolicies(defaultPolicies(type))}>
              Reset to defaults
            </Button>
            <Button size="xs" onClick={startJob} disabled={working !== undefined}>
              Optimize vote policies
            </Button>
          </div>
          {working && <div>Working: {working}</div>}
          {results && (
            <>
              <hr className="my-3" />
              <div>Maximize accuracy:</div>
              <ShowOptimized optimized={results.accuracy} compare={defAggStats} />
              <div>Maximize f1:</div>
              <ShowOptimized optimized={results.f1} compare={defAggStats} />
              <div>Maximize precision:</div>
              <ShowOptimized optimized={results.precision} compare={defAggStats} />
              <div>Maximize recall:</div>
              <ShowOptimized optimized={results.recall} compare={defAggStats} />
            </>
          )}
        </div>
        <div>
          <div className="font-bold">Ensemble model aggregation</div>
          <AggregateStats algo="ensemble" agg={metrics.ensemble.aggStats} />
        </div>
      </div>
      <MediaGrid type={type} msums={msums} track={false} expanded={false} />
    </>
  )
}

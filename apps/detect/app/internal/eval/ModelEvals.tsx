"use client"

import { Fragment, useState } from "react"
import { Tooltip } from "flowbite-react"
import { MediaType } from "../../data/media"
import { format, colorize, RadioItem, radioRow } from "../ui"
import { ModelMetrics, SingleModelEval } from "../metrics"
import { MediaSummary } from "../summarize"
import CSVDownloadLink from "../components/CSVDownloadLink"
import MediaGrid from "./MediaGrid"

function headerLabel(label: string, tip: string, placement: "top" | "right" = "top") {
  return (
    <Tooltip content={tip} style="light" placement={placement}>
      <div className="text-xs">{label}</div>
    </Tooltip>
  )
}

function formatCsv(evals: SingleModelEval[]) {
  const headers = ["Model", "Accuracy", "F1", "Precision", "Recall", "True negative %", "Cutoff"]
  return [
    headers,
    ...evals.map((ee) => [
      ee.key,
      ee.accuracy.toFixed(2),
      ee.f1.toFixed(2),
      ee.precision.toFixed(2),
      ee.recall.toFixed(2),
      ee.negAcc.toFixed(2),
      ee.fakeScore.toFixed(2),
    ]),
  ]
}

const typeFilters: RadioItem<MediaType | undefined>[] = [
  { id: undefined, label: "All" },
  { id: "video", label: "Video media" },
  { id: "audio", label: "Audio media" },
]

export default function ModelEvals({ label, type, msums }: { label: string; type: MediaType; msums: MediaSummary[] }) {
  // for audio we allow filtering to just video-audio tracks or just pure-audio tracks
  const [typeFilter, setTypeFilter] = useState<MediaType | undefined>(undefined)
  msums = typeFilter ? msums.filter((mm) => mm.type == typeFilter) : msums

  const metrics = new ModelMetrics(type)
  for (const ms of msums) {
    if (type == ms.type && (ms.type != "audio" || typeFilter != "video")) metrics.note(ms)
    if (type == "audio" && ms.type == "video" && ms.audioId && typeFilter != "audio") metrics.note(ms)
  }

  const activeEvals = metrics.evals.filter((ev) => ev.total > 0).sort(SingleModelEval.compare)

  return (
    <>
      <div className="flex flex-row flex-wrap gap-5 mb-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-row gap-5">
            <span className="font-bold">{label} models</span>
            {type === "audio" && radioRow(typeFilters, typeFilter, setTypeFilter)}
            <span className="grow" />
            <span>
              <CSVDownloadLink filename={`${type}-models.csv`} generateData={() => formatCsv(activeEvals)} />
            </span>
          </div>
          <div>
            <div>
              Included: {metrics.fake + metrics.real} &ndash; {colorize("TRUE", metrics.fake)} fake,{" "}
              {colorize("FALSE", metrics.real)} real
            </div>
            <div className="mt-5 grid grid-cols-[3fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-2">
              <div></div>
              {headerLabel("Acc.", "Accuracy (% classified correctly): (TP+TN)/(TP+FP+TN+FN)")}
              {headerLabel("F1", "F1: harmonic average of precision and recall.")}
              {headerLabel("Prec.", "Precision: TP / (TP+FP)")}
              {headerLabel("Rec.", "Recall (positive accuracy): TP / (TP+FN)")}
              {headerLabel("TN%", "Negative accuracy: TN / (TN+FP)")}
              {headerLabel("FP%", "False positive rate: FP / (FP+TN)")}
              {headerLabel("FN%", "False negative rate: FN / (FN+TP)")}
              {headerLabel("Fake", "Number of fake media processed by this model.")}
              {headerLabel("Real", "Number of real media processed by this model.")}
              {headerLabel("Cutoff", "Scores at or above this value are considered fake by this model.")}
              {activeEvals.map((ev) => (
                <Fragment key={ev.name}>
                  <div>
                    <b>{ev.name}</b>:
                  </div>
                  {format.metric(ev.accuracy)}
                  <div>{ev.f1.toFixed(2)}</div>
                  {format.metric(ev.precision)}
                  {format.metric(ev.recall)}
                  {format.metric(ev.negAcc)}
                  {format.failMetric(ev.fpRate)}
                  {format.failMetric(ev.fnRate)}
                  <div>{format.fake(ev.fake)}</div>
                  <div>{format.real(ev.real)}</div>
                  <div>{ev.fakeScore.toFixed(2)}</div>
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
      <MediaGrid type={type} msums={msums} track={true} expanded={false} />
    </>
  )
}

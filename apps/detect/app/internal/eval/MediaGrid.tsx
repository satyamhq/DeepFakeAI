"use client"

import { useState } from "react"
import { Trulean } from "@prisma/client"
import { MdExpandMore, MdExpandLess } from "react-icons/md"
import { siteUrl } from "../../site"
import { MediaType, typeLabels, typeIcons } from "../../data/media"
import { meansFake, meansReal, meansUnknown, fakeLabels } from "../../data/groundTruth"
import { formatPct, scoreMeansFake } from "../../data/model"
import { Verdict } from "../../data/verdict"
import { manipulationModelInfo } from "../../model-processors/all"
import { analysisLink, colors, colorize, format, table, RadioItem, radioRow } from "../ui"
import { MediaSummary, makeModelHeaders } from "../summarize"
import CSVDownloadLink from "../components/CSVDownloadLink"

const verdictToFake: Record<Verdict, Trulean> = {
  unknown: "UNKNOWN",
  trusted: "FALSE",
  low: "FALSE",
  uncertain: "UNKNOWN",
  high: "TRUE",
}

const formatCsvScore = (score: number | undefined) => (score == undefined || score < 0 ? "" : score.toFixed(2))

function typeMatches(msum: MediaSummary, wantType: MediaType, includeVideoAudio: boolean) {
  return msum.type == wantType || (includeVideoAudio && msum.type == "video" && msum.audioId)
}

type ErrorFilter = "all" | "false" | "falsePos" | "falseNeg"
function errorMatches(msum: MediaSummary, filter: ErrorFilter): boolean {
  if (filter === "all") return true
  // if both video and audio are unknown, it cannot match
  if (meansUnknown(msum.mainFake) && meansUnknown(msum.audioFake)) return false
  // if we said uncertain, it cannot match
  if (msum.voteVerdict === "uncertain" || msum.voteVerdict === "unknown") return false
  // otherwise compare whether it is fake to whether we said it was fake
  const isFake = meansFake(msum.mainFake) || meansFake(msum.audioFake)
  const saidFake = msum.voteVerdict === "high"
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

const errorToggles: RadioItem<ErrorFilter>[] = [
  { id: "all", label: "All" },
  { id: "false", label: "Errors" },
  { id: "falsePos", label: "False Pos" },
  { id: "falseNeg", label: "False Neg" },
]

function formatLabel(ms: MediaSummary, includeDate = true) {
  const Icon = typeIcons[ms.type]
  return (
    <div className="flex flex-col">
      <div className="flex flex-row gap-2 items-center">
        <Icon /> {analysisLink(ms.id, ms.handle || ms.id, "_blank")}
      </div>
      {includeDate && `${ms.resolvedDate} `}
      {ms.keywords}
    </div>
  )
}

export default function MediaGrid({
  title,
  type,
  msums,
  track,
  expanded,
}: {
  title?: string
  type: MediaType
  msums: MediaSummary[]
  track: boolean
  expanded: boolean
}) {
  const [showMedia, setShowMedia] = useState(expanded)
  const [errorFilter, setErrorFilter] = useState<ErrorFilter>("all")

  const isVideo = type == "video"
  const includeVideoAudio = track && type == "audio"
  const filtered = msums.filter((ms) => typeMatches(ms, type, includeVideoAudio) && errorMatches(ms, errorFilter))

  const show = (type: MediaType, modelId: string): boolean => manipulationModelInfo(modelId).mediaType == type
  const modelHeaders = makeModelHeaders(filtered)
  const typeHeaders = modelHeaders.filter((mm) => show(type, mm))
  if (type == "video" && !track) typeHeaders.push(...modelHeaders.filter((mm) => show("audio", mm)))

  const colorClaim = (fake: Trulean, claim: Trulean) =>
    meansUnknown(claim)
      ? format.indet("Uncertain")
      : meansUnknown(fake)
        ? format.indet(fakeLabels[claim])
        : meansReal(fake) === meansReal(claim)
          ? format.good(fakeLabels[claim])
          : format.bad(fakeLabels[claim])

  const pickFake = (ms: MediaSummary) =>
    includeVideoAudio && ms.type == "video" ? ms.audioFake : track ? ms.mainFake : ms.fake
  const formatFake = (ms: MediaSummary) => colorize(pickFake(ms), fakeLabels[pickFake(ms)])
  const formatVerdict = (ms: MediaSummary) => colorClaim(pickFake(ms), verdictToFake[ms.voteVerdict])
  const csvVerdict = (ms: MediaSummary) => fakeLabels[verdictToFake[ms.voteVerdict]]

  const headers = ["Id"]
  const csvHeaders = ["Id", "Audio ID", "Resolved", "Handle", "Keywords", "Speakers"]
  const formatters = [formatLabel]

  // if we have few modes to show, put resolved date in its own column
  if (typeHeaders.length < 3) {
    formatters[0] = (mm) => formatLabel(mm, false)
    headers.push("Resolved")
    formatters.push((mm) => <span className="text-nowrap">{mm.resolvedDate}</span>)
  }

  headers.push("Ground Truth")
  csvHeaders.push("Overall Ground Truth")
  csvHeaders.push("Relabeled Primary Ground Truth")
  csvHeaders.push("Relabeled Audio Ground Truth")
  csvHeaders.push("No Photorealistic Faces")
  csvHeaders.push("Public Comments")

  formatters.push(formatFake)

  if (!track) {
    headers.push("We Said")
    csvHeaders.push("We Said")
    formatters.push(formatVerdict)

    headers.push("Relevant")
    csvHeaders.push("Relevant")
    formatters.push((ms) => (
      <>
        {ms.experimental.map((ee, ii) => (
          <div className="text-sm" key={ii}>
            {ee}
          </div>
        ))}
      </>
    ))
  }

  headers.push(...typeHeaders)
  formatters.push(
    ...typeHeaders.map(
      (model) =>
        function ScorePct(ms: MediaSummary) {
          const score = ms.scores[model]
          if (score == -1) return <span key={model}>n/a</span>
          const predict = scoreMeansFake(manipulationModelInfo(model), score)
          const fake = pickFake(ms)
          const color = meansUnknown(fake) ? colors.unknown : meansFake(fake) == predict ? colors.good : colors.bad
          return (
            <span key={model} className={color}>
              {score === undefined ? "" : formatPct(score)}
            </span>
          )
        },
    ),
  )

  const allCsvHeaders = [...csvHeaders, ...typeHeaders, "Analysis", "Media"]
  if (isVideo) {
    allCsvHeaders.push("Video Object Overlay")
    allCsvHeaders.push("Video Text Overlay")
    allCsvHeaders.push("Video Effects & Filters")
  }
  const formatCsv = (typeHeaders: string[], msums: MediaSummary[]) => [
    allCsvHeaders,
    ...msums.map((ms) => {
      const values = [
        ms.id,
        ms.audioId ?? "",
        ms.resolvedDate,
        `"${ms.handle}"`,
        `"${ms.keywords}"`,
        `"${ms.speakers}"`,
        fakeLabels[pickFake(ms)],
        fakeLabels[ms.relabelFake],
        fakeLabels[ms.relabelAudioFake],
        "" + ms.noPhotorealisticFaces,
        `"${ms.publicComments.replaceAll('"', '""')}"`,
      ]
      if (!track) {
        values.push(csvVerdict(ms))
        values.push(ms.experimental.join(" "))
      }
      values.push(...typeHeaders.map((model) => formatCsvScore(ms.scores[model])))
      values.push(`${siteUrl}/media/analysis?id=${ms.id}`)
      // one media URL had a comma https://media.cnn.com/api/v1/images/stellar/prod/240206193248-vallas-deepfake-audio.jpg?c=16x9&q=w_800,c_fill
      values.push(ms.mediaUrl.replace(/,/g, "%2C"))

      if (isVideo) {
        values.push(ms.videoObjectOverlay ?? "")
        values.push(ms.videoTextOverlay ?? "")
        values.push(ms.videoEffects ?? "")
      }

      return values
    }),
  ]

  return (
    <>
      <div className="flex flex-row gap-5 items-center">
        <span className="font-bold">{title ?? `${typeLabels[type]} details`}</span>
        <span>
          {showMedia ? (
            <MdExpandLess onClick={() => setShowMedia(false)} />
          ) : (
            <MdExpandMore onClick={() => setShowMedia(true)} />
          )}
        </span>
        {!track && radioRow(errorToggles, errorFilter, setErrorFilter)}
        <span className="grow" />
        <span>
          <CSVDownloadLink filename={`${type}-media.csv`} generateData={() => formatCsv(typeHeaders, filtered)} />
        </span>
      </div>
      {showMedia && table(filtered, (ms) => ms.id, headers, formatters)}
    </>
  )
}

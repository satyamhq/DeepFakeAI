"use client"

import { useState, useContext } from "react"
import { useQuery } from "@tanstack/react-query"
import { Badge, Button, Card } from "flowbite-react"
import { FiInfo } from "react-icons/fi"
import { VscFeedback } from "react-icons/vsc"
import { RequestState, Prisma, VerifiedSource } from "@prisma/client"
import { JoinedMedia, mediaType } from "../../data/media"
import {
  ManipulationCategory,
  ModelResult,
  CachedResults,
  manipulationCategoryInfo,
  compareResults,
  fetchResults,
} from "../../data/model"
import { resolveResults } from "../../data/verdict"
import { FetchProgress } from "../../services/mediares"
import { DebugContext } from "../../components/DebugContext"
import MediaError from "../resolve/MediaError"
import { ResultsCard } from "./ModelCards"
import { MediaCard, MediaDetailsCard } from "./MediaCard"
import MetadataEditor from "./MetadataEditor"
import FeedbackTable from "./FeedbackTable"
import { useUser } from "@clerk/nextjs"
import { getRoleByUser } from "../../auth"
import { compareCategories, gatherAnalysisCategories } from "./utils"
import { fetchMediaProgress } from "../../actions/mediares"
import Insights from "./insights/Insights"

export type FeedbackWithUser = Prisma.UserFeedbackGetPayload<{ include: { user: true } }>

const POLLING_INTERVAL = 3000
const isDone = (state: string | undefined) => state === "COMPLETE" || state === "ERROR"

function MetadataEditorOpener({ media }: { media: JoinedMedia }) {
  const [showEditor, setShowEditor] = useState(media.meta != null)
  return showEditor ? (
    <MetadataEditor media={media} />
  ) : (
    <Card>
      Unreviewed media.
      <Button onClick={() => setShowEditor(true)}>Add Metadata</Button>
    </Card>
  )
}

function useResolveMedia(media: JoinedMedia): FetchProgress {
  // poll the status of the download and display progress
  const POLLING_INTERVAL = 3000
  const isDownloading = (rsp: FetchProgress) => rsp.result == "progress" && !rsp.url
  let progress: FetchProgress = {
    result: "progress",
    url: media.mediaUrl,
    size: media.size,
    audioUrl: media.audioUrl,
    total: media.size,
    transferred: 0,
  }
  const cacheState = useQuery({
    queryKey: ["media", media.id],
    queryFn: () => fetchMediaProgress(media),
    refetchInterval: (query) => (!query.state.data || isDownloading(query.state.data) ? POLLING_INTERVAL : false),
  })

  if (cacheState.isSuccess) {
    progress = cacheState.data
    if (cacheState.data.result == "progress" && cacheState.data.size > 0 && cacheState.data.url) {
      media.size = cacheState.data.size
      media.mediaUrl = cacheState.data.url
      media.audioUrl = cacheState.data.audioUrl
      if (!media.mediaUrl.includes("truemedia-media.s3")) {
        console.warn("Failed to obtain cache URL for downloaded media!")
        console.warn(cacheState.data)
      }
    }
  }

  return progress
}

export default function ResultsPage({
  media,
  postUrl,
  feedback,
  verifiedSource,
  ignoreCache,
  hasUserQueried,
  isVerifiedLabelEnabled,
}: {
  media: JoinedMedia
  postUrl: string
  feedback: FeedbackWithUser[]
  verifiedSource: VerifiedSource | null
  ignoreCache: boolean
  hasUserQueried: boolean
  isVerifiedLabelEnabled: boolean
}) {
  const { user } = useUser()
  const role = getRoleByUser(user)
  const { debug } = useContext(DebugContext)

  const currentUserFeedback = feedback.find((item) => item.userId === role.id)

  const type = mediaType(media.mimeType)
  const ready: ModelResult[] = []
  const pending: string[] = []
  const errmsgs: string[] = []

  let cached = media.results as CachedResults
  let longest = media.analysisTime
  let loading = false
  const query = useQuery({
    queryKey: ["fetch-results", media.id],
    queryFn: () => fetchResults(media.id, role.id === ""),
    refetchInterval: (query) => (isDone(query.state.data?.state) ? false : POLLING_INTERVAL),
    enabled: ignoreCache || Object.keys(cached).length == 0,
  })
  if (query.isLoading) loading = true
  else if (query.isError) errmsgs.push(query.error.message)
  else if (query.isSuccess) {
    switch (query.data.state) {
      case RequestState.ERROR:
        errmsgs.push(...query.data.errors)
        break
      case RequestState.PROCESSING:
        pending.push(...query.data.pending)
      // fall through and add results
      case RequestState.COMPLETE:
        cached = query.data.results
        longest = query.data.analysisTime
        break
    }
  }
  ready.push(...resolveResults(type, cached))

  // sort the results by decreasing rank/fakeness score
  ready.sort(compareResults)

  const analysisRanks = gatherAnalysisCategories({ media, ready })
  const analysisCards = Object.keys(analysisRanks).reduce(
    (acc, cat) => {
      const category = cat as ManipulationCategory
      acc[category] = analysisRanks[category].map((result) => <ResultsCard key={result.modelId} result={result} />)
      return acc
    },
    {} as Record<ManipulationCategory, JSX.Element[]>,
  )

  const analysisSections: JSX.Element[] = []
  for (const cat of Object.keys(analysisCards).sort(compareCategories) as ManipulationCategory[]) {
    const cards = analysisCards[cat]
    const info = manipulationCategoryInfo[cat]
    const Icon = info.icon
    analysisSections.push(
      <div key={cat}>
        <div className="text-left mt-5 mb-5">
          <div className="flex flex-row gap-2 text-3xl items-center">
            <Icon />
            {info.label}
            <Badge color="gray" size="sm">
              {cards.length}
            </Badge>
          </div>
          <div className="ml-10">{info.descrip}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{cards}</div>
      </div>,
    )
  }

  const details =
    errmsgs.length > 0 ? (
      <MediaError action="evaluate media" errors={errmsgs} />
    ) : loading ? (
      <div className="pt-5 text-slate-500 text-center">Loading results...</div>
    ) : analysisSections.length == 0 ? (
      <div className="pt-5 text-slate-500 text-center">No AI analysis detected evidence of manipulation.</div>
    ) : undefined

  const progress = useResolveMedia(media)
  return (
    <div className="w-full flex flex-col gap-y-14 divide-y divide-slate-600">
      <MediaCard
        media={media}
        progress={progress}
        postUrl={postUrl}
        ready={ready}
        pending={pending}
        currentUserFeedback={currentUserFeedback}
        isVerifiedLabelEnabled={isVerifiedLabelEnabled}
      />
      {debug && role.canEditMetadata && <MetadataEditorOpener media={media} />}
      {debug && role.internal && feedback.length > 0 && (
        <div>
          <div className="flex flex-row gap-2 items-center text-3xl mt-5 mb-5">
            <VscFeedback />
            User Feedback
          </div>
          <FeedbackTable feedback={feedback} />
        </div>
      )}

      <Insights media={media} cached={cached} ready={ready} pending={pending} />

      {analysisSections}
      {details}
      <div>
        <div className="flex flex-row gap-2 items-center text-3xl mt-5 mb-5">
          <FiInfo />
          Details
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-y-5 md:gap-x-5">
          <MediaDetailsCard
            media={media}
            ready={ready}
            pending={pending}
            longest={longest}
            verifiedSource={verifiedSource}
            postUrl={postUrl}
            hasUserQueried={hasUserQueried}
          />
        </div>
      </div>
    </div>
  )
}

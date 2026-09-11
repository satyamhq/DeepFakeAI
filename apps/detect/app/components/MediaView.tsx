"use client"

import { Media, AnalysisResult } from "@prisma/client"
import { useQuery } from "@tanstack/react-query"
import { type SingleProgress } from "../services/mediares"
import MediaPreview from "./MediaPreview"
import { MediaHandleRef } from "./ShowMedia"
import { fetchSingleProgress } from "../actions/mediares"

const POLLING_INTERVAL = 3000
const isDownloading = (rsp: SingleProgress) => rsp.result == "progress" && !rsp.url

export default function MediaView({
  media,
  backgroundColor,
  maxHeight,
  mediaRef,
  analyses,
}: {
  media: Media
  backgroundColor?: string
  maxHeight?: string
  mediaRef?: MediaHandleRef
  analyses?: AnalysisResult[]
}) {
  const cacheState = useQuery({
    queryKey: ["media", media.id],
    queryFn: () => fetchSingleProgress(media.id),
    refetchInterval: (query) => (!query.state.data || isDownloading(query.state.data) ? POLLING_INTERVAL : false),
  })

  let progress: SingleProgress = { result: "progress", transferred: 0, total: 0 }
  if (cacheState.isSuccess) progress = cacheState.data
  else if (cacheState.isError) progress = { result: "failure", reason: `${cacheState.error}` }

  return (
    <MediaPreview
      media={media}
      analyses={analyses}
      progress={progress}
      backgroundColor={backgroundColor}
      maxHeight={maxHeight}
      mediaRef={mediaRef}
    />
  )
}

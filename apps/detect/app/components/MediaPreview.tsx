"use client"

import { Media, AnalysisResult } from "@prisma/client"
import { SingleProgress } from "../services/mediares"
import { formatPct } from "../data/model"
import ShowMedia, { MediaHandleRef } from "./ShowMedia"
import LoadingDots from "./LoadingDots"

export default function MediaPreview({
  media,
  progress,
  header,
  backgroundColor,
  maxHeight,
  mediaRef,
  analyses,
}: {
  media: Media
  progress: SingleProgress
  header?: JSX.Element
  backgroundColor?: string
  maxHeight?: string
  mediaRef?: MediaHandleRef
  analyses?: AnalysisResult[]
}) {
  // we might still be resolving the cached media URL, in which case we should show a loading UI
  // in here instead of trying to show the (undisplayable) source media URL
  if (progress.result == "progress") {
    const { transferred, total, url } = progress
    if (total > 0 && url) {
      media.size = total
      media.mediaUrl = url
      return (
        <>
          {header}
          <ShowMedia
            id={media.id}
            ref={mediaRef}
            url={media.mediaUrl}
            mimeType={media.mimeType}
            controls={true}
            backgroundColor={backgroundColor}
            maxHeight={maxHeight}
            analyses={analyses}
          />
        </>
      )
    }
    const mb = (transferred / (1024 * 1024)).toFixed(1),
      pct = formatPct(transferred / total)
    return (
      <div className="flex flex-col justify-center w-full h-full p-5 bg-gray-700 gap-5">
        <div className="text-bold text-center w-full">Downloading Media</div>
        <LoadingDots color="#FFF" />
        {total > 0 && (
          <div className="text-center">
            {mb}MB - {pct}
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="flex flex-col justify-center w-full h-full p-5 bg-gray-700 text-center" role="alert">
      <strong className="font-bold  text-red-700">Failed to download media:</strong>
      <span className="block sm:inline">{progress.reason}</span>
    </div>
  )
}

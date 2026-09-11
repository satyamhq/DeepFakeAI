"use client"

import { MediaType, thumbnailUrl } from "../../app/data/media"
import { VideoCameraIcon, ImageIcon, MicrophoneIcon, QuestionMarkIcon } from "./icons"

export function Placeholder({ mediaType, verdict }: { mediaType: MediaType; verdict?: string }) {
  const border = !verdict ? "" : `border-2 border-manipulation-${verdict}-500`
  return (
    <div className={"grid rounded-lg text-gray-400 bg-gray-600 h-20 flex-col place-content-center " + border}>
      {mediaType === "video" ? (
        <VideoCameraIcon />
      ) : mediaType === "image" ? (
        <ImageIcon />
      ) : mediaType === "audio" ? (
        <MicrophoneIcon />
      ) : (
        <QuestionMarkIcon />
      )}
    </div>
  )
}

export default function MediaThumbnail({
  mediaId,
  verdict,
  mediaType,
}: {
  mediaId: string
  verdict: string
  mediaType: MediaType
}) {
  const thumbnail = thumbnailUrl(mediaId)
  const border = `border-manipulation-${verdict}-500`
  return (
    <object className={"rounded-lg w-full border-2 pointer-events-none " + border} type="image/png" data={thumbnail}>
      {/* <object> is used to attempt to load the thumbnail and the Placeholder is shown if the data fails to load.  */}
      <Placeholder mediaType={mediaType} />
    </object>
  )
}

"use client"

import { RefObject } from "react"
import { AnalysisResult } from "@prisma/client"
import VideoFaceMask from "./face-bounding-boxes/VideoFaceMask"
import { thumbnailUrl } from "../data/media"
import { mediaContainerStyles, mediaStyles } from "./ShowMedia"

export default function ShowVideo({
  url,
  id,
  mimeType,
  controls,
  backgroundColor,
  maxHeight,
  videoRef,
  analyses,
}: {
  url: string
  id: string
  mimeType: string
  controls: boolean
  backgroundColor?: string
  maxHeight?: string
  videoRef: RefObject<HTMLVideoElement>
  analyses?: AnalysisResult[]
}) {
  return (
    <>
      <video
        ref={videoRef}
        id="video_media"
        className={`${maxHeight} ${mediaContainerStyles(backgroundColor)}`}
        controls={controls}
        autoPlay={controls}
      >
        <source src={url} type={mimeType} />
        <img className={mediaStyles(maxHeight)} src={thumbnailUrl(id)} />
      </video>
      {analyses && <VideoFaceMask videoRef={videoRef} analyses={analyses} />}
    </>
  )
}

"use client"

import { AnalysisResult } from "@prisma/client"
import { useState, forwardRef, useRef, useImperativeHandle, RefObject } from "react"
import { FaPlay } from "react-icons/fa"
import { thumbnailUrl } from "../data/media"
import ShowVideo from "./ShowVideo"
import ImageFaceMask, { Dimensions } from "./face-bounding-boxes/ImageFaceMask"

export interface MediaHandle {
  pause: () => void
}

export type MediaHandleRef = RefObject<MediaHandle>

// min-w-0/min-h-0 ensure that the media can shrink smaller inside flex, otherwise
// flex starts with "auto" and if the media is large, it will overflow.
export const mediaContainerStyles = (backgroundColor: string = "bg-gray-700") =>
  `relative grow flex items-center justify-center min-h-0 min-w-0 ${backgroundColor}`
export const mediaStyles = (maxHeight: string = "max-h-full") => `object-contain max-w-full ${maxHeight}`

const VideoClickThrough = ({
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
}) => {
  const [video, setVideo] = useState(false)
  const cursor = controls ? `cursor-pointer` : ""

  return controls && video ? (
    <ShowVideo
      url={url}
      id={id}
      mimeType={mimeType}
      controls={controls}
      backgroundColor={backgroundColor}
      maxHeight={maxHeight}
      videoRef={videoRef}
      analyses={analyses}
    />
  ) : (
    <div className={`${mediaContainerStyles(backgroundColor)} ${cursor}`} onClick={() => setVideo(true)}>
      <img className={mediaStyles(maxHeight)} src={thumbnailUrl(id)} />
      <FaPlay className="absolute drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]" size={40} />
    </div>
  )
}

interface ShowMediaProps {
  id: string
  url: string
  mimeType: string
  controls: boolean
  backgroundColor?: string
  maxHeight?: string
  analyses?: AnalysisResult[]
}

const ShowMedia = forwardRef<MediaHandle, ShowMediaProps>(
  ({ id, url, mimeType, controls, backgroundColor, maxHeight, analyses }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const imageRef = useRef<HTMLImageElement>(null)

    const [dimensions, setDimensions] = useState<Dimensions | null>(null)

    useImperativeHandle(ref, () => ({
      pause: () => {
        if (audioRef.current) {
          audioRef.current.pause()
        }
        if (videoRef.current) {
          videoRef.current.pause()
        }
      },
    }))

    const handleLoad = () => {
      setDimensions({
        elWidth: imageRef.current?.width ?? 0,
        elHeight: imageRef.current?.height ?? 0,
        mediaWidth: imageRef.current?.naturalWidth ?? 0,
        mediaHeight: imageRef.current?.naturalHeight ?? 0,
      })
    }

    return mimeType.startsWith("audio/") ? (
      <div className={mediaContainerStyles(backgroundColor)}>
        <audio ref={audioRef} controls src={url} />
      </div>
    ) : mimeType.startsWith("video/") ? (
      <VideoClickThrough
        url={url}
        id={id}
        mimeType={mimeType}
        controls={controls}
        videoRef={videoRef}
        backgroundColor={backgroundColor}
        maxHeight={maxHeight}
        analyses={analyses}
      />
    ) : (
      <div className={mediaContainerStyles(backgroundColor)}>
        <img className={mediaStyles(maxHeight)} src={thumbnailUrl(id)} ref={imageRef} onLoad={handleLoad} />
        {analyses && dimensions && <ImageFaceMask dimensions={dimensions} analyses={analyses} />}
      </div>
    )
  },
)
ShowMedia.displayName = "ShowMedia"

export default ShowMedia

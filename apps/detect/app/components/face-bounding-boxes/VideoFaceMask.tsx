import { AnalysisResult } from "@prisma/client"
import { RefObject, useEffect, useRef, useState } from "react"

type Vertice = { x: number; y: number }
type Dimension = { top: number; bottom: number; left: number; right: number }
type PolyClassification = { class: string; score: number }
type PolyMeta = { type: string; score: number; id: string }

type HiveVideoBoundingPoly = {
  vertices: Vertice[]
  dimensions: Dimension
  classes: PolyClassification[]
  meta: PolyMeta
}

type HiveVideoFrame = {
  time: number
  bounding_poly: HiveVideoBoundingPoly[]
}

type MediaInfo = {
  width: number
  height: number
  duration: number
}

type HiveVideoInput = {
  media: MediaInfo
}

type HiveVideoStatus = {
  response: {
    input: HiveVideoInput
    output: HiveVideoFrame[]
  }
}

type HiveVideoJSON = {
  status: HiveVideoStatus[]
}

function scoreFromPoly(poly: HiveVideoBoundingPoly) {
  return Math.max(
    0.0001,
    poly.classes.find((classification: PolyClassification) => classification.class === "yes_deepfake")?.score ?? 0,
  )
}

function scoreToStyle(score: number) {
  let color = "lime"
  let lineWidth = 2
  if (score > 0.8) {
    color = "red"
    lineWidth = 3
  } else if (score > 0.5) {
    color = "yellow"
    lineWidth = 2
  }
  return { color, lineWidth }
}

function getLatestFrame(frames: HiveVideoFrame[], timestamp: number) {
  for (let i = 1; i < frames.length; i++) {
    const thisFrame = frames[i - 1]
    const nextFrame = frames[i]
    if (nextFrame.time > timestamp) {
      return thisFrame
    }
  }
  return null
}

function distanceToOrigin(poly: HiveVideoBoundingPoly) {
  return Math.sqrt(Math.pow(poly.dimensions.left, 2) + Math.pow(poly.dimensions.top, 2))
}

function drawSummary(
  ctx: CanvasRenderingContext2D,
  frames: HiveVideoFrame[],
  timestamp: number,
  duration: number,
  width: number,
) {
  const dy = 10
  let maxY = dy
  for (let i = 1; i < frames.length; i++) {
    const lastFrame = frames[i - 1]
    const thisFrame = frames[i]

    if (lastFrame.bounding_poly.length === 0) {
      continue
    }

    const frameLength = thisFrame.time - lastFrame.time
    const x0 = (lastFrame.time / duration) * width
    const boxWidth = (frameLength / duration) * width

    const polys = lastFrame.bounding_poly.map((poly) => ({ ...poly, distance: distanceToOrigin(poly) }))
    polys.sort((a, b) => b.distance - a.distance)

    polys.forEach((poly, index) => {
      const score = scoreFromPoly(poly)
      const { color } = scoreToStyle(score)

      const yy = dy * index
      maxY = Math.max(maxY, yy)

      ctx.fillStyle = color
      ctx.fillRect(x0, yy, boxWidth, dy)
    })
  }

  const cursorX = (timestamp / duration) * width
  ctx.fillStyle = "white"
  ctx.fillRect(cursorX, 0, 1, maxY)
}

function drawFaces(ctx: CanvasRenderingContext2D, frame: HiveVideoFrame, xScale: number, yScale: number) {
  frame.bounding_poly.forEach((poly: HiveVideoBoundingPoly) => {
    const x0 = xScale * poly.dimensions.left
    const y0 = yScale * poly.dimensions.top
    const width = xScale * (poly.dimensions.right - poly.dimensions.left)
    const height = yScale * (poly.dimensions.bottom - poly.dimensions.top)

    const evidenceOfManipulation = scoreFromPoly(poly)
    const { color, lineWidth } = scoreToStyle(evidenceOfManipulation)

    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.strokeRect(x0, y0, width, height)
    ctx.font = "bold 20px monospace"
    ctx.fillStyle = color
    ctx.fillText(("" + evidenceOfManipulation).substring(0, 5), x0 + 10, y0 + height - 10)
  })
}

export default function VideoFaceMask({
  videoRef,
  analyses,
}: {
  videoRef: RefObject<HTMLVideoElement>
  analyses: AnalysisResult[]
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawingBoxes, setIsDrawingBoxes] = useState(true)
  const [isDrawingSummary, setIsDrawingSummary] = useState(true)
  const [frames, setFrames] = useState<HiveVideoFrame[]>([])
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | undefined>()
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let json
    try {
      const hive = analyses.find((result) => result.source === "hive-video")
      if (!hive) return
      json = JSON.parse(hive.json)
      if (!json.status || json.status.length < 1 || !json.status[0].response) {
        throw new Error("Error parsing hive video JSON")
      }
      const hiveJSON = json as HiveVideoJSON
      const response = hiveJSON.status[0].response
      setMediaInfo(response.input.media)
      setFrames(response.output)
    } catch (e) {
      console.error("Error parsing hive-video JSON", e)
      setHasError(true)
    }
  }, [analyses])

  useEffect(() => {
    if (!mediaInfo) return
    const { width, height, duration } = mediaInfo
    canvasRef.current?.addEventListener("click", () => false)
    const ctx = canvasRef.current?.getContext("2d")
    const draw = () => {
      if (canvasRef.current?.width && canvasRef.current.height) {
        const videoElWidth = videoRef.current?.clientWidth ?? 0
        const videoElHeight = videoRef.current?.clientHeight ?? 0
        canvasRef.current.width = videoElWidth
        canvasRef.current.height = videoElHeight
        if (ctx && videoElWidth !== 0 && videoElHeight !== 0) {
          // Store the scale factor of the original video resolution versus the current canvas
          const xScale = videoElWidth / width
          const yScale = videoElHeight / height

          // It is possible a frame may have a late timestamp, like a face doesn't occur
          // until the end of the movie. Don't use a frame if the current timestamp of the
          // movie hasn't gotten to that frame yet.
          const timestamp = videoRef.current?.currentTime ?? 0
          const frame = getLatestFrame(frames, timestamp)
          if (isDrawingSummary) {
            drawSummary(ctx, frames, timestamp, duration, videoElWidth)
          }
          if (isDrawingBoxes && frame && frame.time < timestamp) {
            drawFaces(ctx, frame, xScale, yScale)
          }
        }
      }
      window.requestAnimationFrame(draw)
    }
    window.requestAnimationFrame(draw)
  }, [videoRef, isDrawingBoxes, isDrawingSummary, mediaInfo, frames])

  if (hasError) {
    return <div className="text-white">VideoFaceMask: Unable to draw face bounding boxes.</div>
  }

  return (
    <>
      <canvas ref={canvasRef} className="absolute z-1 pointer-events-none"></canvas>
      <label className="inline">
        <input onChange={() => setIsDrawingBoxes(!isDrawingBoxes)} type="checkbox" checked={isDrawingBoxes} /> Draw face
        bounding boxes
      </label>
      <label className="inline">
        <input onChange={() => setIsDrawingSummary(!isDrawingSummary)} type="checkbox" checked={isDrawingSummary} />{" "}
        Draw summary
      </label>
    </>
  )
}

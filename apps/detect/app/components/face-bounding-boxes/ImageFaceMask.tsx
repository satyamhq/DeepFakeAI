import { AnalysisResult } from "@prisma/client"
import { useEffect, useRef, useState } from "react"
import getErrorMessage from "../../utils/getErrorMessage"

type FaceBoundingBox = {
  left: number
  top: number
  right: number
  bottom: number
  confidence: number
}

export type Dimensions = {
  elWidth: number
  elHeight: number
  mediaWidth: number
  mediaHeight: number
}

function scoreFromPoly(box: FaceBoundingBox) {
  return Math.max(0.0001, box.confidence)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function scoreToStyle(score: number) {
  // only return white boxes around faces to indicate we are not saying this face is REAL or FAKE
  return { color: "white", lineWidth: 2 }
}

function drawFaces(ctx: CanvasRenderingContext2D, faces: FaceBoundingBox[], xScale: number, yScale: number) {
  faces.forEach((box: FaceBoundingBox) => {
    const x0 = xScale * box.left
    const y0 = yScale * box.top
    const width = xScale * (box.right - box.left)
    const height = yScale * (box.bottom - box.top)

    const evidenceOfManipulation = scoreFromPoly(box)
    const { color, lineWidth } = scoreToStyle(evidenceOfManipulation)

    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.strokeRect(x0, y0, width, height)
    ctx.font = "bold 20px monospace"
    ctx.fillStyle = color
    ctx.fillText(("" + evidenceOfManipulation).substring(0, 5), x0 + 10, y0 + height - 10)
  })
}

export default function ImageFaceMask({
  dimensions,
  analyses,
}: {
  dimensions: Dimensions
  analyses: AnalysisResult[]
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawingBoxes, setIsDrawingBoxes] = useState(true)
  const [faces, setFaces] = useState<FaceBoundingBox[]>([])
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    let facesJSON
    try {
      const facesAnalysis = analyses.find((result) => result.source === "faces")
      if (!facesAnalysis) {
        throw new Error("No data from `faces` analysis available.")
      }
      facesJSON = JSON.parse(facesAnalysis.json ?? "")
      if (!facesJSON) {
        throw new Error("Error parsing `faces` JSON")
      }
      setFaces(facesJSON.faces as FaceBoundingBox[])
    } catch (e) {
      const message = getErrorMessage(e)
      console.error("Error parsing JSON", message)
      setErrorMessage(message)
    }
  }, [analyses])

  useEffect(() => {
    const hasFaces = faces && faces.length > 0
    if (!dimensions || !hasFaces) return
    canvasRef.current?.addEventListener("click", () => false)
    canvasRef.current!.width = dimensions.elWidth
    canvasRef.current!.height = dimensions.elHeight
    const ctx = canvasRef.current?.getContext("2d")
    const draw = () => {
      if (dimensions && ctx) {
        // Store the scale factor of the original image resolution versus the current canvas
        const xScale = dimensions.elWidth / dimensions.mediaWidth
        const yScale = dimensions.elHeight / dimensions.mediaHeight
        if (isDrawingBoxes) {
          drawFaces(ctx, faces, xScale, yScale)
        }
      }
    }
    draw()
  }, [dimensions, isDrawingBoxes, faces])

  if (errorMessage) {
    return <div className="text-white">{errorMessage}</div>
  }

  const noFaces = <span>No faces detected.</span>
  const toggleFaces = (
    <>
      <input onChange={() => setIsDrawingBoxes(!isDrawingBoxes)} type="checkbox" checked={isDrawingBoxes} /> Face
      Bounding Boxes
    </>
  )

  return (
    <div className="absolute top-0 left-0 z-1 w-full h-full">
      <canvas ref={canvasRef} className="pointer-events-none"></canvas>
      <div>
        <label className="inline absolute bottom-0 left-0 right-0 text-center cursor-pointer">
          {faces && faces.length > 0 ? toggleFaces : noFaces}
        </label>
      </div>
    </div>
  )
}

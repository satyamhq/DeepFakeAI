import path from "path"
import { promises as fs } from "fs"
import sharp, { OverlayOptions } from "sharp"
import resolveConfig from "tailwindcss/resolveConfig"
import * as tailwindConfig from "../../../tailwind.config"
import { verdicts } from "../../data/verdict"
import { misleadingBackgroundColor, misleadingTextColor } from "../../components/EvidenceLabels"
import { shouldShowMisleadingLabel } from "../../media/analysis/utils"
import { JoinedMedia } from "../../data/media"
import { determineFake, meansHumanVerified } from "../../data/groundTruth"
import {
  unverifiedBackgroundColor,
  unverifiedTextColor,
  verifiedBackgroundColor,
  verifiedTextColor,
} from "../../media/analysis/VerificationBadge"
import { isVerifiedLabelEnabled } from "../../server"

type ImageResult = {
  image: Buffer
  contentType: string
}

async function svgToBuffer(svg: JSX.Element): Promise<Buffer> {
  // unfortunately nextJS really doesn't like server-side rendering of JSX components
  // doing the dynamic import here avoids the overly aggressive blocking error
  // https://github.com/vercel/next.js/issues/43810
  const { renderToString } = await import("react-dom/server")
  return Buffer.from(renderToString(svg))
}

const fullConfig = resolveConfig(tailwindConfig)
function resolveColor(className: string): string {
  // color is something like bg-COLOR-ID-weight or text-COLOR-ID-weight
  const lld = className.lastIndexOf("-")
  const weight = className.substring(lld + 1)
  const fld = className.indexOf("-")
  // we have to navigate nested color tables, so `brand-green` resolves to `{ brand: { green: { ... } } }`
  const parts = className.substring(fld + 1, lld).split("-")
  let colors: any = fullConfig.theme.colors
  for (const part of parts) {
    colors = colors[part]
    if (!colors) {
      console.warn(`Missing color [class=${className}, name=${part}]`)
      return "#FFFFFF"
    }
  }
  return colors[weight]
}

// We don't support drawing an overlay for "unknown"
type OverlayVerdict = "low" | "uncertain" | "high" | "trusted"

type VerifiedLabelState = "verified" | "unverified" | "none"

export async function addVerdictOverlay(
  inputImage: ArrayBuffer,
  media: JoinedMedia,
  verdict: OverlayVerdict,
  addWatermark: boolean,
): Promise<ImageResult> {
  const { mediaBackground } = verdicts[verdict]
  const groundTruth = determineFake(media)

  // trusted and low are identical at the moment
  const simplifiedVerdict = verdict === "trusted" ? "low" : verdict

  const verifiedLabelState: VerifiedLabelState =
    simplifiedVerdict !== "high" ? "none" : meansHumanVerified(groundTruth) ? "verified" : "unverified"
  const shouldShowVerifiedLabel = verifiedLabelState !== "none" && isVerifiedLabelEnabled()
  const verifiedSuffix = shouldShowVerifiedLabel ? `-${verifiedLabelState}` : ""

  // these images are generated using GIMP and the /assets/overlay-text.xcf file
  // if the text needs to change you can update them there and then export each state
  // as a PNG
  const textSummary = await fs.readFile(
    path.resolve(`./assets/thumbnail-overlay/${simplifiedVerdict}${verifiedSuffix}.png`),
  )

  const mediaBackgroundRaw = resolveColor(mediaBackground)
  const misleadingBackgroundRaw = resolveColor(misleadingBackgroundColor)
  const misleadingTextRaw = resolveColor(misleadingTextColor)
  const verifiedBackgroundRaw =
    verifiedLabelState === "verified"
      ? resolveColor(verifiedBackgroundColor)
      : verifiedLabelState === "unverified"
        ? resolveColor(unverifiedBackgroundColor)
        : undefined
  const verifiedTextRaw =
    verifiedLabelState === "verified"
      ? resolveColor(verifiedTextColor)
      : verifiedLabelState === "unverified"
        ? resolveColor(unverifiedTextColor)
        : undefined
  const base = await sharp(inputImage)

  const borderWidth = 8
  const topBarHeight = 29
  const borderRadius = 7.5

  const verifiedX = 408
  const verifiedIconSize = 16
  const verifiedIconMargin = 10

  const finalWidth = 600
  const finalHeight = 315

  const svgOverlay = await svgToBuffer(
    <svg width={finalWidth} height={finalHeight}>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        stroke={mediaBackgroundRaw}
        strokeWidth={borderWidth}
        fill="none"
        rx={borderRadius}
      />
      <rect x="0" y={borderWidth / 2} width="100%" height={topBarHeight - borderWidth / 2} fill={mediaBackgroundRaw} />
      {shouldShowVerifiedLabel && (
        <>
          <rect
            x={verifiedX}
            y={borderWidth / 2}
            width="94"
            rx="4"
            height={topBarHeight - borderWidth / 2 - 4}
            fill={verifiedBackgroundRaw}
          />
          {verifiedLabelState === "verified" && (
            <g
              transform={`translate(${verifiedX + verifiedIconMargin},${verifiedIconSize / 2 - 1}) scale(${verifiedIconSize / 24})`}
            >
              <path
                fill="none"
                stroke={verifiedTextRaw}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m8.032 12 1.984 1.984 4.96-4.96m4.55 5.272.893-.893a1.984 1.984 0 0 0 0-2.806l-.893-.893a1.984 1.984 0 0 1-.581-1.403V7.04a1.984 1.984 0 0 0-1.984-1.984h-1.262a1.983 1.983 0 0 1-1.403-.581l-.893-.893a1.984 1.984 0 0 0-2.806 0l-.893.893a1.984 1.984 0 0 1-1.403.581H7.04A1.984 1.984 0 0 0 5.055 7.04v1.262c0 .527-.209 1.031-.581 1.403l-.893.893a1.984 1.984 0 0 0 0 2.806l.893.893c.372.372.581.876.581 1.403v1.262a1.984 1.984 0 0 0 1.984 1.984h1.262c.527 0 1.031.209 1.403.581l.893.893a1.984 1.984 0 0 0 2.806 0l.893-.893a1.985 1.985 0 0 1 1.403-.581h1.262a1.984 1.984 0 0 0 1.984-1.984V15.7c0-.527.209-1.031.581-1.403Z"
              />
            </g>
          )}
        </>
      )}
    </svg>,
  )

  const showMisleadingLabel = shouldShowMisleadingLabel({ media, verdict })
  const misleadingWidth = 178
  const misleadingHeight = 24
  const circleXIconSize = 16
  const circleXIconMargin = 8
  const misleadingTextImage = await fs.readFile(path.resolve(`./assets/thumbnail-overlay/misleading.png`))
  const svgMisleadingLabel = await svgToBuffer(
    <svg viewBox={`0 0 ${misleadingWidth} ${misleadingHeight}`}>
      <rect x="0" y="0" width="100%" height="100%" rx="4" fill={misleadingBackgroundRaw} />
      <g
        transform={`translate(${circleXIconMargin},${(misleadingHeight - circleXIconSize) / 2}) scale(${circleXIconSize / 24})`}
      >
        <path
          fill="none"
          stroke={misleadingTextRaw}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="m15 9-6 6m0-6 6 6m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </g>
    </svg>,
  )

  const svgMisleadingLabelOption: OverlayOptions[] = [
    {
      input: svgMisleadingLabel,
      top: topBarHeight + 12,
      left: finalWidth - misleadingWidth - 16,
    },
    {
      input: misleadingTextImage,
    },
  ]

  const watermark = await fs.readFile(path.resolve("./public/trueMediaWatermark.png"))
  const watermarkOverlayOption: OverlayOptions = {
    input: watermark,
    blend: "overlay",
  }

  const roundedCornersMask = await svgToBuffer(
    <svg width={finalWidth} height={finalHeight}>
      <rect width="100%" height="100%" rx={borderRadius} />
    </svg>,
  )

  const outputImage = await base
    .resize({ width: finalWidth, height: finalHeight, fit: "contain", background: "rgb(55 65 81)" })
    .composite([
      ...(addWatermark ? [watermarkOverlayOption] : []),
      ...(showMisleadingLabel ? svgMisleadingLabelOption : []),
      {
        input: svgOverlay,
      },
      {
        input: textSummary,
      },
      {
        input: roundedCornersMask,
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer()

  return { image: outputImage, contentType: "image/png" }
}

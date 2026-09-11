import { Tooltip } from "flowbite-react"
import { FlowbiteCheckBadgeIcon, FlowbiteCheckBadgeOpenIcon, FlowbiteUserOutline } from "../../components/icons"
import { JoinedMedia } from "../../data/media"
import { meansHumanVerified, determineFake } from "../../data/groundTruth"
import { Verdict } from "../../data/verdict"
import { isMisleadingReal, isMisleadingUnknown, shouldShowMisleadingLabel } from "./utils"

function MisleadingUnknown() {
  return (
    <div className="flex gap-2 items-center pt-2">
      <FlowbiteUserOutline className="size-11 text-gray-200" />
      <div className="leading-normal mt-0.5">
        Human analyst labeled this media as&nbsp;
        <Tooltip
          style="light"
          theme={{ target: "w-fit inline" }}
          content="Deceptive editing or staged content, but presence of generative AI unknown"
        >
          <span className="font-bold">misleading</span>
        </Tooltip>
        &nbsp;but could not verify whether AI manipulation is present.
      </div>
    </div>
  )
}

function MisleadingReal() {
  return (
    <div className="flex gap-2 items-center pt-2">
      <FlowbiteCheckBadgeIcon className="size-7 fill-blue-300" />
      <div className="leading-normal mt-0.5">
        Verified by human analyst to not have AI manipulation but still&nbsp;
        <Tooltip style="light" theme={{ target: "w-fit inline" }} content="Deceptive editing or staged content">
          <span className="font-bold">misleading</span>
        </Tooltip>
      </div>
    </div>
  )
}

function verificationText(isTrustedSource: boolean, isHumanVerified: boolean) {
  if (isTrustedSource && isHumanVerified) {
    return "Trusted Source, and verified by human analyst"
  } else if (isTrustedSource) {
    return "Trusted Source"
  } else if (isHumanVerified) {
    return "Verified by human analyst"
  }
}

export function VerificationBadge({ media, verdict }: { media: JoinedMedia; verdict: Verdict }) {
  const isTrustedSource = verdict === "trusted"
  const groundTruth = determineFake(media)
  const isHumanVerified = meansHumanVerified(groundTruth)
  if (!isTrustedSource && !isHumanVerified && !shouldShowMisleadingLabel({ media, verdict })) {
    return null
  }

  // we have custom messaging for misleading media which depends on ground truth and verdict
  if (isMisleadingUnknown({ media, verdict })) return <MisleadingUnknown />
  if (isMisleadingReal({ media })) return <MisleadingReal />
  // otherwise don't say anything about misleading

  const text = verificationText(isTrustedSource, isHumanVerified)
  return (
    <div className="flex gap-2 items-center pt-2">
      <FlowbiteCheckBadgeIcon className="size-7 fill-blue-300" />
      <div className="leading-normal mt-0.5">{text}</div>
    </div>
  )
}

export const verifiedBackgroundColor = "bg-blue-900"
export const verifiedTextColor = "text-blue-300"
const VerifiedLabel = () => (
  <span className={`${verifiedBackgroundColor} ${verifiedTextColor} text-nowrap text-sm rounded p-1 px-3`}>
    <FlowbiteCheckBadgeOpenIcon className="inline mr-1 mb-1 w-4 h-4" />
    Verified
  </span>
)

export const unverifiedBackgroundColor = "bg-gray-900"
export const unverifiedTextColor = "text-gray-200"
const UnverifiedLabel = () => (
  <span className={`${unverifiedBackgroundColor} ${unverifiedTextColor} text-nowrap text-sm rounded p-1 px-3`}>
    Unverified
  </span>
)

export function VerificationLabel({ media }: { media: JoinedMedia }) {
  const groundTruth = determineFake(media)
  const isHumanVerified = meansHumanVerified(groundTruth)
  return isHumanVerified ? <VerifiedLabel /> : <UnverifiedLabel />
}

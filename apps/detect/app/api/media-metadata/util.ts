import { Trulean } from "@prisma/client"
import { meansFake, meansReal } from "../../data/groundTruth"
import { JoinedMedia } from "../../data/media"
import { mediaVerdict, Verdict, verdicts } from "../../data/verdict"
import { isMisleadingReal, isMisleadingUnknown, shouldShowMisleadingLabel } from "../../media/analysis/utils"

// `asVerdict` is a hack to pass verdicts in to this function for unit tests.
export function getSummary(media: JoinedMedia, asVerdict?: Verdict) {
  const verdict = asVerdict ?? mediaVerdict(media).experimentalVerdict
  if (meansFake(media?.meta?.fake ?? Trulean.UNKNOWN)) {
    return verdicts.high.longSummary
  }

  if (media && shouldShowMisleadingLabel({ media, verdict })) {
    if (isMisleadingReal({ media })) {
      return verdicts["low"].misleadingSummary
    } else if (isMisleadingUnknown({ media, verdict })) {
      return verdicts["unknown"].misleadingSummary
    }
  }

  if (meansReal(media?.meta?.fake ?? Trulean.UNKNOWN)) {
    return verdicts.low.longSummary
  }

  return verdicts[verdict].longSummary
}

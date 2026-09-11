import { Media, Trulean, MediaMetadata } from "@prisma/client"
import { JoinedMedia, mediaType } from "./media"

/** Returns the ground truth for `media`. If it is a video, this combines the video and audio ground truths into a
 * single ground truth (where if either is fake, the whole media is fake). */
export const determineFake = (media: Media & { meta: MediaMetadata | null }): Trulean =>
  !media.meta ? "UNKNOWN" : determineMediaFake(media.mimeType, media.meta.fake, media.meta.audioFake)

export function determineMediaFake(mimeType: string, fake: Trulean, audioFake: Trulean): Trulean {
  const groundTruth = mediaType(mimeType) == "video" ? determineVideoFake(fake, audioFake) : fake
  return groundTruth === "UNREVIEWED" ? "UNKNOWN" : groundTruth
}

export function determineVideoFake(videoFake: Trulean, audioFake: Trulean): Trulean {
  if (meansFake(videoFake) || meansFake(audioFake)) return "TRUE"
  if (meansReal(videoFake) && meansReal(audioFake)) return "FALSE"
  return "UNKNOWN"
}

export const meansReal = (fake: Trulean): boolean => fake === "FALSE"
export const meansFake = (fake: Trulean): boolean => fake === "TRUE"
export const meansUnknown = (fake: Trulean | undefined): boolean => !fake || fake === "UNREVIEWED" || fake === "UNKNOWN"
export const meansHumanVerified = (fake: Trulean): boolean => !meansUnknown(fake)

export const fakeLabels: Record<Trulean, string> = {
  UNREVIEWED: "Unknown",
  UNKNOWN: "Unknown",
  TRUE: "Fake",
  FALSE: "Real",
}

export const fakeLabelsWithUnreviewed: Record<Trulean, string> = {
  ...fakeLabels,
  UNREVIEWED: "Unreviewed",
}

export const fakeLabelWithUnreviewed = (meta: MediaMetadata | null) =>
  meta ? fakeLabelsWithUnreviewed[meta.fake] : fakeLabelsWithUnreviewed.UNREVIEWED

/** If ground truth has been set to any value, including Unknown, it is considered "reviewed."
 * This is used to display an icon in the UI so that our media reviewers know whether or not they've already reviewed it. */
export const hasBeenReviewed = (media: JoinedMedia) =>
  !!media.meta &&
  media.meta?.fake !== "UNREVIEWED" &&
  (mediaType(media.mimeType) !== "video" || media.meta?.audioFake !== "UNREVIEWED")

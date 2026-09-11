import { createHash } from "crypto"
import { IconType } from "react-icons"
import { AiOutlineAudio } from "react-icons/ai"
import { FaRegCheckCircle, FaRegImage } from "react-icons/fa"
import { FiVideo } from "react-icons/fi"
import { Media, MediaMetadata } from "@prisma/client"
import { FILE_UPLOAD_PSEUDO_URL_BASE } from "../media/upload/util"

export type MediaType = "video" | "audio" | "image" | "unknown"

export function mediaType(mimeType: string): MediaType {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  return "unknown"
}

export const typeLabels: Record<MediaType, string> = {
  video: "Video",
  image: "Image",
  audio: "Audio",
  unknown: "Unknown",
}

export const typeIcons: Record<MediaType, IconType> = {
  video: FiVideo,
  image: FaRegImage,
  audio: AiOutlineAudio,
  unknown: FaRegCheckCircle, // TODO
}

export const iconForMimeType = (mimeType: string) => typeIcons[mediaType(mimeType)]

/** Defines the places from whence media may have come. Note that we deduce this based on the media URL which is often
 * some hairy CDN URL, but usually has enough info that we can identify the source. Also note that this is duplicative
 * with the Notable Media "SOURCE" enumeration, which is not ideal. The Notable Media stuff was done separately and
 * before this, and technically is a source that is assigned by a human not deduced from a media URL. I don't want to
 * use some Notable Media implementation detail in a more general way, and I don't have time to refactor everything
 * anyway. So it's duplication for now! */
export type MediaSource = keyof typeof sourceLabels

/** Human friendly names for the media sources. */
export const sourceLabels = {
  facebook: "Facebook",
  instagram: "Instagram",
  mastodon: "Mastodon",
  reddit: "Reddit",
  tiktok: "TikTok",
  twitter: "Twitter/X",
  youtube: "YouTube",
  upload: "Upload",
  other: "Other",
}

/** Determines the source of `media` based on its media URL (not the post URL). */
export function determineSource(media: Media): MediaSource {
  const mediaUrl = media.mediaUrl
  if (mediaUrl.includes("fbcdn.net")) return "facebook"
  if (mediaUrl.includes("cdninstagram.com")) return "instagram"
  if (mediaUrl.includes("preview.redd.it")) return "reddit"
  if (mediaUrl.includes("tiktokcdn.com")) return "tiktok"
  if (mediaUrl.includes("twimg.com")) return "twitter"
  if (mediaUrl.includes("googlevideo.com")) return "youtube"
  if (mediaUrl.startsWith(FILE_UPLOAD_PSEUDO_URL_BASE)) return "upload"
  return "other"
}

export function determineSourceAccount(postUrl: string): string | null {
  if (!postUrl) {
    return null
  }
  const tiktokMatch = postUrl.match(/https?:\/\/(www\.)?tiktok.com\/@([^/]+)/)
  if (tiktokMatch) {
    return tiktokMatch[2] ?? null
  }
  const twitterMatch = postUrl.match(/https?:\/\/(www\.)?(twitter|x).com\/([^/]+)\/status/)
  if (twitterMatch) {
    return twitterMatch[3] ?? null
  }
  const redditMatch = postUrl.match(/https?:\/\/(www\.)?reddit.com\/(r\/[^/]+)\//)
  if (redditMatch) {
    return redditMatch[2] ?? null
  }

  return null
}

export type JoinedMedia = Media & {
  meta: MediaMetadata | null
  audioUrl?: string
}

export function emptyMeta(mediaId: string): MediaMetadata {
  return {
    mediaId,
    fake: "UNREVIEWED",
    audioFake: "UNREVIEWED",
    relabelFake: "UNREVIEWED",
    relabelAudioFake: "UNREVIEWED",
    source: "",
    handle: "",
    language: "",
    keywords: "",
    comments: "",
    speakers: "",
    fakeReviewer: "",
    audioFakeReviewer: "",
    relabelFakeReviewer: "",
    relabelAudioFakeReviewer: "",
    misleading: false,
    noPhotorealisticFaces: false,
    videoObjectOverlay: "UNREVIEWED",
    videoTextOverlay: "UNREVIEWED",
    videoEffects: "UNREVIEWED",
  }
}

export type MediaTrack = { type: MediaType; mimeType: string; id: string; file: string; url: string }

export function mkTrack(mimeType: string, id: string, file: string, url: string): MediaTrack {
  return { type: mediaType(mimeType), mimeType, id, file, url }
}

const THUMBNAIL_BUCKET_BASE = "<OPEN-TODO-PLACEHOLDER>.amazonaws.com/"

export function thumbnailUrl(mediaId: string) {
  const didx = mediaId.lastIndexOf(".")
  const baseMediaId = didx >= 0 ? mediaId.substring(0, didx) : mediaId
  return `${THUMBNAIL_BUCKET_BASE}${baseMediaId}`
}

export function sizeLabel(size: number): string {
  if (size === 0) return ""
  else if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`
  else if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)}MB`
  else return `${(size / (1024 * 1024 * 1024)).toFixed(1)}GB`
}

export function durationLabel(seconds: number) {
  if (seconds > 5400) return "> 90m"
  if (seconds > 60) return `${Math.floor(seconds / 60).toFixed(0)}m ${(seconds % 60).toFixed(0)}s`
  if (seconds >= 0) return `${seconds.toFixed(0)}s`
  return "-"
}

export function fileExt(media: { mediaUrl: string; mimeType: string }): string {
  const url = new URL(media.mediaUrl)
  const path = url.pathname
  const ldidx = path.lastIndexOf(".")
  if (ldidx >= 0) return path.substring(ldidx)
  const parts = media.mimeType.split(";")[0].split("/")
  return `.${parts.length > 1 ? parts[1] : "unknown"}`
}

export function hashUrl(url: string): string {
  return createHash("md5").update(url).digest("base64")
}

export function analyzeUrl(mediaId: string, postUrl: string): string {
  return `/media/analysis?id=${mediaId}&post=${hashUrl(postUrl)}`
}

"use client"

import Link from "next/link"
import { Media, PostMedia } from "../../types/db"
import { RiDeleteBinLine } from "react-icons/ri"

import { EvidenceLabel } from "../../components/EvidenceLabels"
import { DayMonthLabel } from "../../components/DateLabel"
import MediaThumbnail from "../../components/MediaThumbnail"
import { hashUrl, mediaType, typeLabels } from "../../data/media"
import { mediaTypeIcon } from "../notable/NotableMediaCard"

export type UserQuery = {
  post: PostMedia & { media: Media }
  rank: string
}

export const UserHistoryHeader = () => (
  <div className="grid grid-cols-12 rounded-t-xl border-b border-gray-600 text-gray-400 uppercase text-xs font-semibold bg-gray-800/80 py-3 px-2 mt-4 items-center">
    <div className="col-span-4 sm:col-span-3 md:col-span-2 text-center">Preview</div>
    <div className="col-span-8 sm:col-span-5 md:col-span-5 pl-2">Verdict &amp; Details</div>
    <div className="hidden sm:block sm:col-span-2 md:col-span-2 text-center">Platform / Type</div>
    <div className="hidden md:block md:col-span-2 text-center">Queried Date</div>
    <div className="hidden sm:block sm:col-span-2 md:col-span-1 text-center">Action</div>
  </div>
)

export default function UserHistoryItem({
  userEmail: _userEmail,
  postUrl,
  mediaId,
  mimeType,
  verdict,
  time,
  sourcePlatform,
  score,
  isFallback,
  onDelete,
}: {
  userEmail: string
  postUrl: string
  mediaId: string
  mimeType: string
  verdict: string
  time?: Date
  sourcePlatform?: string
  score?: number
  isFallback?: boolean
  onDelete?: (mediaId: string, postUrl: string) => void
}) {
  const type = mediaType(mimeType ?? "unknown")
  const label = typeLabels[type]
  const icon = mediaTypeIcon[type.toLocaleUpperCase()]

  const url = `/media/analysis?id=${mediaId}&post=${hashUrl(postUrl)}`

  return (
    <div className="grid grid-cols-12 border-b border-gray-700/60 hover:bg-gray-700/40 transition items-center px-2 py-3 text-sm text-gray-300">
      {/* Preview Thumbnail */}
      <div className="col-span-4 sm:col-span-3 md:col-span-2 text-center flex justify-center">
        <Link prefetch={false} href={url} className="block overflow-hidden rounded-lg hover:opacity-90 transition">
          <MediaThumbnail mediaType={type} mediaId={mediaId} verdict={verdict} />
        </Link>
      </div>

      {/* Details, Verdict, Badges */}
      <div className="col-span-8 sm:col-span-5 md:col-span-5 pl-3 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Link prefetch={false} href={url}>
            <EvidenceLabel verdict={verdict} />
          </Link>
          {score != null && (
            <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-200 font-mono font-medium">
              {score}% AI
            </span>
          )}
          {isFallback && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-950/70 border border-amber-700/70 text-amber-300 font-medium">
              Test Fallback
            </span>
          )}
        </div>
        <Link prefetch={false} href={url} className="hover:text-lime-400 block truncate text-xs text-gray-400">
          {postUrl}
        </Link>
        <div className="sm:hidden flex items-center justify-between mt-2 text-xs text-gray-500">
          <span className="capitalize">{sourcePlatform || label}</span>
          <DayMonthLabel date={time} />
        </div>
      </div>

      {/* Platform & Media Type */}
      <div className="hidden sm:flex sm:col-span-2 md:col-span-2 flex-col items-center justify-center text-xs text-gray-300 gap-1">
        {sourcePlatform && (
          <span className="px-2 py-0.5 rounded-full bg-gray-700/80 text-gray-200 font-medium capitalize">
            {sourcePlatform}
          </span>
        )}
        <div className="flex items-center gap-1 text-gray-400">
          {icon} <span>{label}</span>
        </div>
      </div>

      {/* Date */}
      <div className="hidden md:flex md:col-span-2 flex-col items-center justify-center text-xs text-gray-400">
        <DayMonthLabel date={time} />
      </div>

      {/* Action: Delete */}
      <div className="hidden sm:flex sm:col-span-2 md:col-span-1 items-center justify-center">
        {onDelete && (
          <button
            type="button"
            onClick={() => {
              if (confirm("Remove this query from your history?")) {
                onDelete(mediaId, postUrl)
              }
            }}
            title="Delete from history"
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/40 transition"
          >
            <RiDeleteBinLine className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}

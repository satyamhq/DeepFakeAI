import Link from "next/link"
import { Media, PostMedia } from "@prisma/client"

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
  <div className="grid grid-cols-12 rounded-t-xl border-b border-gray-600 text-gray-500 uppercase text-sm bg-gray-700 py-2 mt-4">
    <div className="col-span-6 md:col-span-5 lg:col-span-4 xl:col-span-2 text-center p-2 h-30">Preview</div>
    <div className="col-span-6 md:col-span-7 lg:col-span-3 xl:col-span-6 p-2">
      <div className="flex lg:hidden">
        <div>Type</div>
        <div className="flex-grow text-right">Queried</div>
      </div>
    </div>
    <div className="hidden lg:block lg:col-span-2 xl:col-span-2 text-center p-2 place-content-center">Media Type</div>
    <div className="hidden lg:block lg:col-span-3 xl:col-span-2 text-center p-2 place-content-center">
      First Queried
    </div>
  </div>
)

export default function UserHistoryItem({
  userEmail,
  postUrl,
  mediaId,
  mimeType,
  verdict,
  time,
}: {
  userEmail: string
  postUrl: string
  mediaId: string
  mimeType: string
  verdict: string
  time?: Date
}) {
  const type = mediaType(mimeType ?? "unknown")
  const label = typeLabels[type]
  const icon = mediaTypeIcon[type.toLocaleUpperCase()]

  const url = `/media/analysis?id=${mediaId}&post=${hashUrl(postUrl)}`

  return (
    <Link prefetch={false} href={url}>
      <div className="grid grid-cols-12 border-b border-gray-500 hover:rounded-lg text-gray-400 hover:bg-gray-700 hover:cursor-pointer">
        <div className="col-span-6 md:col-span-5 lg:col-span-3 xl:col-span-3 text-center p-2 h-30">
          <MediaThumbnail mediaType={type} mediaId={mediaId} verdict={verdict} />
        </div>
        <div className="col-span-6 md:col-span-7 lg:col-span-4 xl:col-span-5 p-2">
          <div className="mb-4">
            <EvidenceLabel verdict={verdict} />
          </div>
          <div className="flex-shrink truncate text-ellipsis">{postUrl}</div>
          <div className="flex lg:hidden">
            <div>
              {icon} {label}
            </div>
            <div className="flex-grow text-right">
              <DayMonthLabel date={time} />
            </div>
          </div>
          <div className="lg:hidden text-right flex-shrink truncate">{userEmail}</div>
        </div>
        <div className="hidden lg:block lg:col-span-2 xl:col-span-2 text-center p-2 place-content-center">
          {icon} {label}
        </div>
        <div className="hidden flex flex-col lg:block lg:col-span-3 xl:col-span-2 text-center p-2 place-content-center">
          <div className="flex justify-around">
            <DayMonthLabel date={time} />
          </div>
          <div className="truncate">{userEmail}</div>
        </div>
      </div>
    </Link>
  )
}

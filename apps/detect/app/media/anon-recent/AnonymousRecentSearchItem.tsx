import Link from "next/link"
import { EvidenceLabel } from "../../components/EvidenceLabels"
import MediaThumbnail from "../../components/MediaThumbnail"
import { mediaType, typeLabels } from "../../data/media"
import { mediaTypeIcon } from "../notable/NotableMediaCard"
import { LocalHistoryItem } from "./local-history"
import { Verdict } from "../../data/verdict"
import { DayMonthLabel } from "../../components/DateLabel"

export default function AnonymousUserHistoryItem({ item, verdict }: { item: LocalHistoryItem; verdict: Verdict }) {
  const type = mediaType(item.mimeType ?? "unknown")
  const label = typeLabels[type]
  const icon = mediaTypeIcon[type.toLocaleUpperCase()]

  const url = "/media/analysis?id=" + item.mediaId

  return (
    <Link prefetch={false} href={url}>
      <div className="grid grid-cols-12 border-b border-gray-500 hover:rounded-lg text-gray-400 hover:bg-gray-700 hover:cursor-pointer">
        <div className="col-span-6 md:col-span-5 lg:col-span-3 xl:col-span-3 text-center p-2 h-30">
          <MediaThumbnail mediaType={type} mediaId={item.mediaId} verdict={verdict} />
        </div>
        <div className="col-span-6 md:col-span-7 lg:col-span-4 xl:col-span-5 p-2">
          <div className="mb-4">
            <EvidenceLabel verdict={verdict} />
          </div>
          <div className="flex-shrink truncate text-ellipsis">{item.postUrl}</div>
          <div className="flex lg:hidden">
            <div>
              {icon} {label}
            </div>
          </div>
        </div>
        <div className="hidden lg:block lg:col-span-2 xl:col-span-2 text-center p-2 place-content-center">
          {icon} {label}
        </div>
        <div className="hidden flex flex-col lg:block lg:col-span-3 xl:col-span-2 text-center p-2 place-content-center">
          <div className="flex justify-around">
            <DayMonthLabel date={item.date} />
          </div>
        </div>
      </div>
    </Link>
  )
}

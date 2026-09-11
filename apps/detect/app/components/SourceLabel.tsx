import Link from "next/link"
import { Badge } from "flowbite-react"
import { FaUpload } from "react-icons/fa6"
import { HiLink } from "react-icons/hi"
import { FILE_UPLOAD_PSEUDO_URL_BASE, parseFakeMediaUrl } from "../media/upload/util"
import { truncate } from "../internal/ui"

export default function SourceLabel({ url }: { url: string }) {
  const isUpload = url.startsWith(FILE_UPLOAD_PSEUDO_URL_BASE)
  const sourceIcon = isUpload ? FaUpload : HiLink
  // For file uploads we don't have a legit post url so instead parse the filename from the mediaUrl
  const sourceLink = isUpload ? (
    <span>{parseFakeMediaUrl(url)?.filename}</span>
  ) : (
    <Link prefetch={false} href={url} target="_blank" rel="noopener noreferrer" className="text-wrap break-all">
      {truncate(url, 80)}
    </Link>
  )
  return (
    <div className="text-slate-400 flex gap-2 text-left">
      <Badge color="gray" icon={sourceIcon} />
      {sourceLink}
    </div>
  )
}

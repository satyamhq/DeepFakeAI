import { Media } from "@prisma/client"
import { MediaPublisherIcon } from "./SiteIcons"

export function PlatformSourceLabel({ media }: { media: Media }) {
  return (
    <>
      <MediaPublisherIcon platform={media.source} />
      <span className="break-all">{media.sourceUserName}</span> (id:{media.sourceUserId})
    </>
  )
}

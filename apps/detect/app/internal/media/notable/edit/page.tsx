import Link from "next/link"
import NotableMediaEditor from "./NotableMediaEditor"
import { db } from "../../../../server"

export const dynamic = "force-dynamic"

export default async function Page({ searchParams }: { searchParams: { id: string } }) {
  const id = searchParams.id ?? ""
  const media = await db.media.findUnique({
    where: { id },
    include: { meta: true },
  })

  if (!media) return <p className="text-red-500">Could not find media with id: {id}</p>

  const notability = await db.notableMedia.findUnique({
    where: { mediaId: id },
  })

  return (
    <div className="flex flex-col w-full">
      <h1 className="font-bold text-xl mb-5">
        <Link href="/internal">Internal</Link>
        &nbsp;→&nbsp;
        <Link href="/internal/media">Media</Link>
        &nbsp;→&nbsp;
        <Link href="/internal/media/notable">Notable</Link>
        &nbsp;→&nbsp; Edit
      </h1>

      <NotableMediaEditor media={media} notability={notability} />
    </div>
  )
}

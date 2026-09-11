import Link from "next/link"
import { getMediaVerdicts } from "../../api/get-verdicts/actions"
import MediaThumbnail from "../../components/MediaThumbnail"
import { mediaType } from "../../data/media"
import { db } from "../../db"

const DAYS_BACK = 30
const MS_PER_DAY = 1000 * 60 * 60 * 24

export default async function Page({ searchParams }: { searchParams: { days?: string } }) {
  const days = searchParams.days ? parseInt(searchParams.days) : DAYS_BACK
  const dateFilter = { time: { gte: new Date(Date.now() - days * MS_PER_DAY) } }

  const queries = await db.query.groupBy({
    by: ["postUrl"],
    _count: {
      postUrl: true,
    },
    where: { ...dateFilter },
    having: { postUrl: { _count: { gt: 1 } } },
    orderBy: {
      _count: {
        postUrl: "desc",
      },
    },
    take: 50,
  })
  return (
    <div>
      <div className="text-4xl bold">
        Top Queries over last {days} day{days !== 1 ? "s" : ""}
      </div>
      {queries.map(async (qq) => {
        const postMedia = await db.postMedia.findFirst({ where: { postUrl: qq.postUrl }, include: { media: true } })
        if (!postMedia?.mediaId) return null
        const verdicts = await getMediaVerdicts([postMedia?.mediaId])
        const verdict = verdicts[postMedia.mediaId]
        const type = mediaType(postMedia.media.mimeType ?? "unknown")
        return (
          <div key={qq.postUrl}>
            <Link href={qq.postUrl}>
              ({qq._count.postUrl}) {qq.postUrl}
            </Link>
            <div className="max-w-96">
              <Link href={"/media/analysis?id=" + postMedia.mediaId}>
                <MediaThumbnail mediaType={type} mediaId={postMedia?.mediaId} verdict={verdict} />
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}

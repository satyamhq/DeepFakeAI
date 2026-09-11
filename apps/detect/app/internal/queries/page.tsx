import { db } from "../../server"
import { table, showText, pageLinks, pageNav, analysisLink, mkLink, PostLink } from "../ui"
import DateLabel from "../../components/DateLabel"
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa"
import { hasBeenReviewed } from "../../data/groundTruth"

export const dynamic = "force-dynamic"

export default async function Page({ searchParams }: { searchParams: { offset: string; mode: string } }) {
  const offset = parseInt(searchParams.offset || "0"),
    count = 15
  const mode = searchParams.mode ?? "all"
  const where = mode == "all" ? {} : { user: { email: { not: { endsWith: "@truemedia.org" } } } }
  const total = await db.query.count({ where: where })
  const queries = await db.query.findMany({
    skip: offset,
    take: count,
    where,
    orderBy: [{ time: "desc" }],
    include: { user: true },
  })

  const postUrls = queries.map((qq) => qq.postUrl)
  const postMedias = await db.postMedia.findMany({ where: { postUrl: { in: postUrls } } })
  const postUrlToMediaId: Record<string, string> = {}
  const mediaIdToPostUrl: Record<string, string> = {}
  for (const pm of postMedias) {
    postUrlToMediaId[pm.postUrl] = pm.mediaId
    mediaIdToPostUrl[pm.mediaId] = pm.postUrl
  }

  const postUrlToIsReviewed: Record<string, boolean> = {}
  const mediaIds: string[] = Object.values(postUrlToMediaId)
  const medias = await db.media.findMany({ where: { id: { in: mediaIds } }, include: { meta: true } })
  for (const media of medias) {
    const postUrl = mediaIdToPostUrl[media.id]
    if (!postUrl) continue
    postUrlToIsReviewed[postUrl] = media ? hasBeenReviewed(media) : false
  }

  const baseUrl = (mode: string) => `/internal/queries?mode=${mode}`
  const modeLink = (mm: string, label: string) =>
    mode == mm ? (
      <span>
        <b>{label}</b>
      </span>
    ) : (
      mkLink(baseUrl(mm), label)
    )

  const formatPost = (url: string) => (
    <div className="max-w-xl break-all">
      <PostLink postUrl={url} />
    </div>
  )

  function postLink(postUrl: string) {
    const mediaId = postUrlToMediaId[postUrl]
    return mediaId ? (
      <>
        {postUrlToIsReviewed[postUrl] ? <FaRegEye className="inline" /> : <FaRegEyeSlash className="inline" />}{" "}
        {analysisLink(mediaId, "Analysis")}
      </>
    ) : (
      mkLink(`/media/resolve?url=${encodeURIComponent(postUrl)}`, "<none>")
    )
  }

  return (
    <>
      {pageNav("Queries")}
      <div className="flex flex-row gap-5 mx-auto mb-5">
        {modeLink("all", "All")}
        {modeLink("external", "External-only")}
        <span className="w-32"></span>
        {pageLinks(baseUrl(mode), offset, count, queries.length, total)}
      </div>
      {table(
        queries,
        (qq) => qq.id,
        ["URL", "Results", "User Id", "Created"],
        [
          (qq) => formatPost(qq.postUrl),
          (qq) => postLink(qq.postUrl),
          (qq) => showText(qq.user.email ?? qq.userId),
          (qq) => <DateLabel date={qq.time} />,
        ],
      )}
    </>
  )
}

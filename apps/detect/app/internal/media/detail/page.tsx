import { AnalysisResult, RequestState } from "@prisma/client"
import { IoWarningOutline } from "react-icons/io5"
import { Tooltip } from "flowbite-react"
import { db } from "../../../server"
import { sizeLabel } from "../../../data/media"
import { ModelResult, CachedResults, ranks, formatPct, cachedResultEqual } from "../../../data/model"
import { mkLink, table, showText } from "../../ui"
import { processors } from "../../../model-processors/all"
import Badge from "../../../components/Badge"
import ErrorBox from "../../../components/ErrorBox"
import DateLabel from "../../../components/DateLabel"
import SourceLabel from "../../../components/SourceLabel"
import MediaView from "../../../components/MediaView"
import ShowSourceButton from "./ShowSourceButton"
import RerunButton from "./RerunButton"
import Link from "next/link"
import CopyTextButton from "../../../components/CopyTextButton"

export const dynamic = "force-dynamic"

function cacheStatus(cached: CachedResults, result: ModelResult) {
  const cres = cached[result.modelId]
  if (!cres) {
    return (
      <Tooltip content={"Not yet cached."}>
        <IoWarningOutline />
      </Tooltip>
    )
  }

  const res = { modelId: result.modelId, ...cres }
  if (cachedResultEqual(res, result)) return undefined

  return (
    <Tooltip content={"Differs from cached result."}>
      <IoWarningOutline />
    </Tooltip>
  )
}

function modelResults(cached: CachedResults, ar: AnalysisResult) {
  const proc = processors[ar.source]
  const data = JSON.parse(ar.json)
  const error = proc.check && proc.check(data)
  if (error) return <div>{error}</div>

  if (ar.requestState != RequestState.COMPLETE) return <div></div>
  const res = proc.adapt(data)
  return (
    <div className="flex flex-col items-end gap-1">
      {res.map((mr) => {
        const info = { ...ranks[mr.rank], shortSummary: formatPct(mr.score) }
        return (
          <div key={mr.modelId} className="flex flex-row gap-3">
            {res.length > 1 && <span>{mr.modelId}</span>}
            <Badge info={info} />
            {cacheStatus(cached, mr)}
          </div>
        )
      })}
    </div>
  )
}

export default async function Page({ searchParams }: { searchParams: { id: string } }) {
  const mediaId = searchParams.id
  if (!mediaId) return <ErrorBox title="Unknown Media" message="Missing required media id parameter." />
  const media = await db.media.findUnique({
    where: { id: mediaId },
    include: { posts: true, meta: true, analysisResults: { orderBy: { source: "asc" } } },
  })
  if (!media) return <ErrorBox title="Unknown Media" message="Unable to find information for that media item." />

  const postMedia = await db.postMedia.findFirst({ where: { mediaId: media.id } })
  const queries = await db.query.findMany({
    where: { postUrl: postMedia?.postUrl },
    include: { user: true },
    distinct: ["userId"],
  })

  const cached = media.results as CachedResults
  const postUrls = media.posts.map((pp) => pp.postUrl)
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-bold flex gap-2">
        Media ID:{" "}
        <Link className="text-lg font-bold text-blue-500 hover:underline" href={`/media/analysis?id=${media.id}`}>
          {media.id}
        </Link>
        <CopyTextButton label="Copy media ID" text={media.id} />
      </h1>
      <div className="flex flex-col gap-2 items-center mx-auto">
        <MediaView media={media} analyses={media.analysisResults} maxHeight="max-h-96" />
        {postUrls.map((purl) => (
          <SourceLabel key={purl} url={purl} />
        ))}
      </div>
      <div>
        <div className="max-w-2xl truncate">Source Media: {mkLink(media.mediaUrl, media.mediaUrl, "_blank")}</div>
        <div>Mime-type: {media.mimeType}</div>
        <div>Duration: {media.duration}s</div>
        <div>Size: {sizeLabel(media.size)}</div>
        <div>
          Resolved at: <DateLabel date={media.resolvedAt} />
        </div>
        <div>Audio Id: {media.audioId ?? "<none>"}</div>
        <div>Audio Mime-type: {media.audioMimeType ?? "n/a"}</div>
        <div>External?: {String(media.external)}</div>
        <div>Analysis time: {media.analysisTime}s</div>
      </div>

      <div>
        <h2 className="font-bold">Users Queried</h2>
        <ul>
          {queries.map((query) => (
            <li key={query.id}>{query.user.email}</li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="font-bold">Analysis Results</h2>
        {table(
          media.analysisResults,
          (rr) => rr.source,
          ["Source", "Started + Completed", "Req State + Id", "Score", "Raw Results"],
          [
            (rr) => showText(rr.source),
            (rr) => (
              <>
                <DateLabel date={rr.created} />
                <br />
                {rr.completed ? <DateLabel date={rr.completed} /> : showText("(incomplete)")}
              </>
            ),
            (rr) => (
              <>
                <div>{rr.requestState ?? "n/a"}</div>
                <div>{rr.requestId || "(none)"}</div>
              </>
            ),
            (rr) => modelResults(cached, rr),
            (rr) => (
              <div className="flex flex-row gap-2">
                <ShowSourceButton source={rr.source} raw={JSON.parse(rr.json)} />
                <RerunButton mediaId={rr.mediaId} source={rr.source} />
              </div>
            ),
          ],
        )}
      </div>
    </div>
  )
}

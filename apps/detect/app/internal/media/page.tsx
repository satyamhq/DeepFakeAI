import { table, showText, pageNav, pageLinks, mkLink, PostLink } from "../ui"
import { getServerRole } from "../../server"
import { iconForMimeType, sizeLabel } from "../../data/media"
import DateLabel from "../../components/DateLabel"
import DeleteButton from "./DeleteButton"
import SearchForm from "./SearchForm"
import {
  getAllReviewers,
  MediaJoinResult,
  MediaSearchParams,
  searchMedia,
  searchParamsDeconstructed,
  searchParamsToString,
} from "./search"
import { fakeLabelWithUnreviewed } from "../../data/groundTruth"
import { MediaExportCSVButton } from "../../components/ExportCSVButton"

export const dynamic = "force-dynamic"

export default async function Page({ searchParams }: { searchParams: MediaSearchParams }) {
  const role = await getServerRole()
  const { skip, take, search, type, truth, audiotruth, fb, reviewer, from, to } =
    searchParamsDeconstructed(searchParams)
  const { total, media } = await searchMedia(searchParams)
  const reviewers = await getAllReviewers()

  const showMedia = (media: MediaJoinResult) => {
    const url = `/media/analysis?id=${media.id}`
    const Icon = iconForMimeType(media.mimeType)
    const posts = media.posts.map((mp) => mp.postUrl)
    return (
      <div>
        <div className="text-nowrap">
          <Icon className="inline mr-1" title={media.mimeType} />
          {mkLink(url, media.meta?.handle || media.id)}
        </div>
        {posts.map((url, ii) => (
          <div key={ii}>
            <PostLink postUrl={url} className="max-w-96 break-all text-xs" />
            <br />
          </div>
        ))}
        <div className="text-xs">{media.meta?.keywords || ""}</div>
      </div>
    )
  }

  const showNotability = (media: MediaJoinResult) =>
    mkLink(`/internal/media/notable/edit?id=${media.id}`, media.notability?.notability ?? "No")

  const showReviewers = (media: MediaJoinResult) => {
    const reviewer1 = media.meta?.fakeReviewer
    const reviewer2 = media.meta?.audioFakeReviewer
    if (!reviewer1 && !reviewer2) {
      return showText("")
    }
    if (reviewer1 && !reviewer2) {
      return showText(reviewer1)
    }
    if (!reviewer1 && reviewer2) {
      return showText(reviewer2)
    }
    if (reviewer1 && reviewer2 && reviewer1 === reviewer2) {
      return showText(`${reviewer1}`)
    }
    return showText(`${reviewer1}, ${reviewer2}`)
  }

  const showFeedback = (media: MediaJoinResult) =>
    showText(media.feedback.length ? media.feedback.length.toString() : "")

  return (
    <>
      <div>
        <div className="float-left">{pageNav("Media")}</div>
        <div className="float-right">
          <MediaExportCSVButton searchParams={searchParams} />
        </div>
      </div>

      <SearchForm
        q={search}
        type={type}
        truth={truth}
        audiotruth={audiotruth}
        fb={fb}
        reviewer={reviewer}
        reviewers={[...reviewers]}
        from={from}
        to={to}
      />

      <div className="mt-4">
        {pageLinks("/internal/media", skip, take, media.length, total, "&" + searchParamsToString(searchParams))}
      </div>

      <div className="text-sm text-gray-500 mb-4">
        Searches match against the Source, Handle, Keywords and Comments metadata as well as the Post URL.
      </div>

      {table(
        media,
        (mm) => mm.id,
        ["Id", "Ground Truth", "Size", "Resolved At", "Notable", "Reviewers", "Feedback", ""],
        [
          (mm) => showMedia(mm),
          (mm) => showText(fakeLabelWithUnreviewed(mm.meta)),
          (mm) => showText(sizeLabel(mm.size)),
          (mm) => <DateLabel date={mm.resolvedAt} />,
          (mm) => showNotability(mm),
          (mm) => showReviewers(mm),
          (mm) => showFeedback(mm),
          (mm) => <DeleteButton mediaId={mm.id} isAdmin={role.admin} />,
        ],
      )}
    </>
  )
}

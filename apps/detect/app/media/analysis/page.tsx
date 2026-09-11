import { Metadata } from "next/types"
import { db, getServerRole, isVerifiedLabelEnabled } from "../../server"
import ErrorBox from "../../components/ErrorBox"
import { fetchSingleProgress } from "../../services/mediares"
import { hashUrl } from "../../data/media"
import { metadata } from "../../layout"
import ResultsPage, { FeedbackWithUser } from "./ResultsPage"
import { idBasedPlatforms } from "../../api/source"
import SignUpCTA from "../../components/SignUpCTA"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { id: string; post: string }
}): Promise<Metadata> {
  const notable = searchParams.id
    ? await db.notableMedia.findUnique({ where: { mediaId: searchParams.id } })
    : undefined
  const title = notable?.title ?? `TrueMedia.org - Deepfake Analysis`
  const thumbnailUrl = notable?.imagePreviewUrl ?? `/api/thumbnail-overlay?mediaId=${searchParams.id}`
  const description = notable?.description ?? metadata.openGraph?.description ?? ""

  return {
    ...metadata,
    title,
    description,
    openGraph: {
      ...metadata.openGraph,
      title,
      description,
      images: thumbnailUrl,
    },
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams: { id: string; post: string; recompute: string }
}) {
  const mediaId = searchParams.id
  const postHash = searchParams.post
  if (!mediaId) return <ErrorBox title="Unknown Media" message="Missing required media id parameter." />

  const media = await db.media.findUnique({
    where: { id: mediaId },
    include: { posts: true, meta: true },
  })
  if (!media) return <ErrorBox title="Unknown Media" message="Unable to find information for that media item." />

  // if this media has unknown size, fire off a request to the mediares server to find out how big it is
  if (media.size == 0) {
    const progress = await fetchSingleProgress(media.id)
    if (progress.result == "failure") {
      console.log(`Failed to fetch media size [id=${media.id}, reason=${progress.reason}]`)
      // if the error is "Unknown media file" then the original resolution failed to complete and we're left with a
      // dangling media record on this side of the system and nothing to ever populate it in the media cache, so just
      // delete this media record so that we'll retry the whole process from the start if they try the query again
      if (progress.reason == "Unknown media file") {
        console.log(`Initial media resolution failed, deleting dangling media record [id=${media.id}]`)
        await db.media.delete({ where: { id: mediaId } })
      }
    } else if (!progress.total) console.log(`Media size not yet known? [id=${media.id}]`)
    else {
      console.log(`Storing media size [id=${media.id}, size=${progress.total}]`)
      media.size = progress.total
      await db.media.update({
        where: { id: media.id },
        data: { size: progress.total },
      })
    }
  }

  // Internal users can see all feedback for this analysis, and the current
  // user can change their own feedback, so we query accordingly.
  const role = await getServerRole()
  let userFeedback: FeedbackWithUser[] = []
  if (role.internal) {
    userFeedback = await db.userFeedback.findMany({ where: { mediaId }, include: { user: true } })
  } else if (role.isLoggedIn) {
    userFeedback = await db.userFeedback.findMany({ where: { mediaId, userId: role.id }, include: { user: true } })
  }
  // figure out which post URL is the one we "reached" this media through
  const post = media.posts.find((pm) => hashUrl(pm.postUrl) == postHash)
  const postUrl = (post ?? media.posts[0]).postUrl

  // see if this user has queried this media, enables actions like delete
  const hasUserQueried =
    (await db.query.findFirst({
      where: { postUrl: postUrl, userId: role.id, isDeleted: false },
    })) !== null

  // if requested, ignore the cached results and recompute them from analysis_results
  const ignoreCache = !!searchParams.recompute

  const lookup = idBasedPlatforms.includes(media.source) ? media.sourceUserId : media.sourceUserName
  const verifiedSource = media.sourceUserName
    ? await db.verifiedSource.findFirst({ where: { platform: media.source, platformId: lookup ?? "" } })
    : null

  return (
    <>
      {role.isNotLoggedIn && <SignUpCTA />}
      <ResultsPage
        media={media}
        postUrl={postUrl}
        feedback={userFeedback}
        verifiedSource={verifiedSource}
        ignoreCache={ignoreCache}
        hasUserQueried={hasUserQueried}
        isVerifiedLabelEnabled={isVerifiedLabelEnabled()}
      />
    </>
  )
}

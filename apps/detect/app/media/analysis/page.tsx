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
  const title = notable?.title ?? `DeepFakeAI - Deepfake Analysis`
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

  // if this media has unknown size, fire off a request to find out how big it is
  if (media.size == 0) {
    try {
      const isUpload = media.mediaUrl && (media.mediaUrl.includes("fileuploads") || media.mediaUrl.startsWith("http"))
      const progress = await fetchSingleProgress(media.id)
      if (progress.result == "failure") {
        console.log(`Notice fetching media size [id=${media.id}, reason=${progress.reason}]`)
        // Never delete uploaded files if external progress query fails
        if (!isUpload && progress.reason == "Unknown media file") {
          console.log(`Initial media resolution failed, deleting dangling media record [id=${media.id}]`)
          await db.media.delete({ where: { id: mediaId } })
        }
      } else if (progress.total && progress.total > 0) {
        console.log(`Storing media size [id=${media.id}, size=${progress.total}]`)
        media.size = progress.total
        await db.media.update({
          where: { id: media.id },
          data: { size: progress.total },
        })
      }
    } catch (err) {
      console.warn(`[Analysis Page] Notice checking media progress for ${media.id}:`, err)
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
  const post = media.posts?.find((pm: any) => hashUrl(pm.postUrl) == postHash)
  const postUrl = (post ?? media.posts?.[0])?.postUrl || media.mediaUrl || ""

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

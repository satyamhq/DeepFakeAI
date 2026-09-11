import { Media, MediaMetadata } from "@prisma/client"
import { db, isGroundTruthUpdateEmailsEnabled } from "../../server"
import { UpdateMetadataRequest } from "./route"
import { sendEmail } from "../email"
import { html, text } from "../../email/verification-added"
import { siteUrl } from "../../site"
import { CHANNEL_SLACK_BOT_DUMP } from "../../utils/Slack"
import * as Slack from "../../utils/Slack"
import { JoinedMedia } from "../../data/media"
import { getSummary } from "./util"

export async function notifyUsersGroundTruthUpdate(mediaId: string, newSummary: string) {
  const postMedia = await db.postMedia.findFirst({ where: { mediaId }, select: { postUrl: true } })
  const media: JoinedMedia | null = await db.media.findUnique({
    where: { id: mediaId },
    include: { meta: true },
  })

  const emails = (
    await db.query.findMany({ where: { postUrl: postMedia?.postUrl, isDeleted: false }, select: { user: true } })
  ).map((query) => query.user.email)

  const comments =
    media?.meta?.comments && media.meta.comments.length > 0
      ? media.meta.comments
      : "Our team of analysts researched this media item."

  emails.forEach((email) => {
    if (!email) return
    const landingPage = `${siteUrl}/media/analysis?id=${mediaId}`
    const imagePreviewUrl = `${siteUrl}/api/thumbnail-overlay?mediaId=${mediaId}`

    const subject = "Human fact checkers changed the verdict"
    const html_ = html(landingPage, imagePreviewUrl, newSummary, comments)
    const text_ = text(landingPage, newSummary, comments)

    sendEmail(email, subject, html_, text_)
  })
  console.log(`GroundTruthUpdate [newSummary=${newSummary}, notifications=${emails.length}]`)
}

export async function humanFactCheckersNotification(oldMedia: (Media & { meta: MediaMetadata | null }) | null) {
  const newMedia = oldMedia ? await db.media.findFirst({ where: { id: oldMedia.id }, include: { meta: true } }) : null
  if (!oldMedia || !newMedia) {
    console.error(`GroundTruthUpdate missing a media [oldMedia.id=${oldMedia?.id}, newMedia.id=${newMedia?.id}]`)
    return
  }
  const oldSummary = getSummary(oldMedia)
  const newSummary = getSummary(newMedia)
  const isChanged = oldSummary !== newSummary
  const isEnabled = isGroundTruthUpdateEmailsEnabled()
  const msg = `GroundTruthUpdate humanFactCheckersNotification [isChanged=${isChanged}, mediaId=${oldMedia?.id}, oldSummary=${oldSummary}, newSummary=${newSummary}, isEnabled=${isEnabled}]`
  console.log(msg)

  if (isChanged) {
    if (!isEnabled) {
      await Slack.postMessage(CHANNEL_SLACK_BOT_DUMP, msg)
    } else {
      try {
        // TODO: update oldSummary and newSummary to save the ID of a string instead of a raw string.
        // https://trello.com/c/aZgRxx63/850-upgrade-groundtruthupdate-to-refer-to-ids-of-strings-rather-than-ui-strings-themselves
        await db.groundTruthUpdate.create({
          data: { mediaId: oldMedia.id, oldSummary, newSummary },
        })
      } catch (e) {
        console.error("GroundTruthUpdate", e)
      }
    }
  }
}

export async function getMediaMetadata(mediaId: string): Promise<MediaMetadata | null> {
  return await db.mediaMetadata.findUnique({ where: { mediaId } })
}

export async function upsertMediaMetadata(mediaId: string, updates: UpdateMetadataRequest): Promise<MediaMetadata> {
  const result = await db.mediaMetadata.upsert({
    where: { mediaId },
    update: {
      ...updates,
    },
    create: {
      mediaId: mediaId,
      ...updates,
    },
  })
  return result
}

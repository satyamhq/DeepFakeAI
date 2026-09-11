import "server-only"
import { Media } from "@prisma/client"
import { MediaResClient, ResolveResponse, ProgressResponse, Failure } from "@truemedia/clients/mediares"

export type ResolvedMedia = Extract<ResolveResponse, { result: "resolved" }>["media"][number]

export type Transferred = Extract<ProgressResponse, { result: "progress" }>["statuses"][string]

export type { ResolveResponse }

type SingleMediaProgress = { result: "progress" } & Transferred
export type SingleProgress = SingleMediaProgress | Failure

type MediaProgress = {
  error?: string
  size: number
  audioUrl?: string
  audioSize?: number
  // This is used to communicate a situation where mediares was asked to download a video and extract the audio track
  // from it, but then discovered once the video was actually downloaded that there was no audio track in the video.
  // Due to the deeply asynchronous nature of the media resolution process and our desire not to make the user stare at
  // a blank screen with a progress indicator on it for longer than necessary, we choose to assume that a video will
  // have an audio track and then clean things up later if we discover that not to be the case, once it is downloaded.
  audioDOA?: boolean
} & SingleMediaProgress
export type FetchProgress = MediaProgress | Failure

export async function fetchSingleProgress(id: string): Promise<SingleProgress> {
  const frsp = await getMediaResClient().fetchProgress([id])
  if (frsp.result != "progress") return frsp
  const status = frsp.statuses[id]
  if (!status) return { result: "failure", reason: "Unknown media file" }
  if (status.error) return { result: "failure", reason: status.error }
  return { ...status, result: "progress" }
}

// mediares returns this precise string as an error when it goes to extract an audio track and discovers that the video
// has no audio track; because of the order in which things happen, we have to clean up the media record for such
// videos and remove their (now known to be non-existent) audio id
const noAudioError = "Video has no audio track"
// TODO: remove this once mediares is updated
const oldNoAudioError = "Unknown media file"

export async function fetchMediaProgress(media: Pick<Media, "id" | "audioId" | "size">): Promise<FetchProgress> {
  console.log(`Fetching download status: ${media.id} (audio: ${media.audioId})`)
  const ids = [media.id]
  if (media.audioId) ids.push(media.audioId)
  const frsp = await getMediaResClient().fetchProgress(ids)
  if (frsp.result != "progress") return frsp

  const res: MediaProgress = {
    result: "progress",
    transferred: 0,
    total: 0,
    size: media.size,
  }
  for (const id of Object.keys(frsp.statuses)) {
    const ss = frsp.statuses[id]
    // if the main media is an error, return an error
    if (ss.error && id == media.id) return { result: "failure", reason: ss.error }
    // fill in the cache urls if we have them
    if (id == media.id) {
      if (ss.url) res.url = ss.url
      if (ss.total > 0) res.size = ss.total
    }
    if (id == media.audioId) {
      res.audioUrl = ss.url
      res.audioSize = ss.total
      // check for DOA audio: if mediares says the video has no audio track (which it discovered after downloading the
      // video and trying to extract the audio track) then declare the audio to be DOA and our caller can remove it
      // from the media record
      if (
        ss.error == noAudioError ||
        // TODO: remove this old check once mediares is updated
        (ss.error == oldNoAudioError && res.url)
      ) {
        res.audioDOA = true
      }
    }
    // aggregate the progress of the two media
    res.transferred += ss.transferred
    res.total += ss.total
  }
  return res
}

let client: MediaResClient | null = null
export function getMediaResClient() {
  if (client != null) return client
  if (!process.env.MEDIA_RESOLVER_URL) {
    throw new Error("MEDIA_RESOLVER_URL env variable not set")
  }
  client = new MediaResClient(process.env.MEDIA_RESOLVER_URL, {
    // tell Vercel to please not cache our requests
    fetch: (req, init = {}) => fetch(req, { ...init, cache: "no-store" }),
  })
  return client
}

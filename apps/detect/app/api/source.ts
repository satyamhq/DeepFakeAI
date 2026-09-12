import { MediaPublisher } from "../types/db"
import { canParseUrl } from "./util"

export type MediaSourceData = {
  source: MediaPublisher
  sourceUserId?: string
  sourceUserName?: string
}

export function extractMediaSourceData(postUrl: string, json: object): MediaSourceData | undefined {
  if (canParseUrl(postUrl)) {
    try {
      switch (determineSourcePlatform(postUrl)) {
        case MediaPublisher.FACEBOOK: {
          // Facebook responses can have different shapes, so we try our best to handle them
          if ((json as any).data?.nodes) {
            const userName = (json as any).data?.nodes[0]?.owner?.name
            const userId = (json as any).data?.nodes[0]?.owner?.id
            return {
              source: MediaPublisher.FACEBOOK,
              sourceUserName: userName,
              sourceUserId: userId,
            }
          } else if ((json as any).data?.node) {
            const userName = (json as any).data?.node?.actors[0]?.name
            const userId = (json as any).data?.node?.actors[0]?.id
            return {
              source: MediaPublisher.FACEBOOK,
              sourceUserName: userName,
              sourceUserId: userId,
            }
          }
          break
        }
        case MediaPublisher.INSTAGRAM: {
          const userName = (json as any).items[0]?.user?.username
          const userId = (json as any).items[0]?.user?.id
          return {
            source: MediaPublisher.INSTAGRAM,
            sourceUserName: userName,
            sourceUserId: userId,
          }
        }
        case MediaPublisher.MASTODON: {
          const mastAccount = (json as any).account
          if (mastAccount) {
            const userName = assembleMastodonUserName(mastAccount)
            // Mastodon's user IDs are unique to each instance...not useful for this
            return {
              source: MediaPublisher.MASTODON,
              sourceUserName: userName,
            }
          }
          break
        }
        case MediaPublisher.REDDIT: {
          const authorUserName = (json as any).data?.children[0]?.data?.author
          const authorId = (json as any).data?.children[0]?.data?.author_fullname
          return {
            source: MediaPublisher.REDDIT,
            sourceUserId: authorId,
            sourceUserName: authorUserName,
          }
        }
        case MediaPublisher.X: {
          const userId = (json as any).data?.author_id
          let userName = undefined
          // The author struct may not be there if the right extensions weren't requested
          if ((json as any).includes?.users) {
            const users = (json as any).includes?.users
            const authorUser = users.find((element: any) => {
              return element.id === userId
            })
            userName = authorUser.username
          }
          return {
            source: MediaPublisher.X,
            sourceUserId: userId,
            sourceUserName: userName,
          }
        }
        case MediaPublisher.YOUTUBE: {
          // YTDLP blob shape...
          let userName = (json as any).channel
          let userId = (json as any).channel_id
          // Fall back to the old shape if we didn't get data
          if (!userName) {
            userName = (json as any).videoDetails?.author
          }
          if (!userId) {
            userId = (json as any).videoDetails?.channelId
          }
          return {
            source: MediaPublisher.YOUTUBE,
            sourceUserId: userId,
            sourceUserName: userName,
          }
        }
        case MediaPublisher.LINKEDIN: {
          return {
            source: MediaPublisher.LINKEDIN,
          }
        }
        case MediaPublisher.GOOGLE_DRIVE: {
          return {
            source: MediaPublisher.GOOGLE_DRIVE,
          }
        }
      }
    } catch (e) {
      console.error("error extracting media source data:", e)
    }
  }
  return undefined
}

export function determineSourcePlatform(url: string): MediaPublisher {
  if (canParseUrl(url)) {
    const parsed = new URL(url)
    if (isFacebook(parsed)) {
      return MediaPublisher.FACEBOOK
    } else if (isInstagram(parsed)) {
      return MediaPublisher.INSTAGRAM
    } else if (isGoogleDrive(parsed)) {
      return MediaPublisher.GOOGLE_DRIVE
    } else if (isReddit(parsed)) {
      return MediaPublisher.REDDIT
    } else if (isTwitter(parsed)) {
      return MediaPublisher.X
    } else if (isYouTube(parsed)) {
      return MediaPublisher.YOUTUBE
    } else if (isLinkedIn(parsed)) {
      return MediaPublisher.LINKEDIN
    } else if (isMastodon(parsed)) {
      // TODO: may not detect account/profile URLs
      return MediaPublisher.MASTODON
    }
  }
  return MediaPublisher.UNKNOWN
}

function isLinkedIn(url: URL): boolean {
  return url.hostname.includes("linkedin.com") || url.hostname.includes("lnkd.in")
}

function isYouTube(url: URL): boolean {
  return url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")
}

function isTwitter(url: URL): boolean {
  return url.hostname.includes("twitter.com") || url.hostname.includes("x.com")
}

function isReddit(url: URL): boolean {
  return url.hostname.includes("reddit.com")
}

function isInstagram(url: URL): boolean {
  return url.hostname.includes("instagram.com")
}

function isFacebook(url: URL): boolean {
  return url.hostname.includes("facebook.com")
}

export function isGoogleDrive(url: URL): boolean {
  return url.hostname.includes("drive.google.com")
}

// Matches URLs like https://c.im/@MishaVanMollusq@sfba.social/112454542589322232
const indirectMastodonUrlRegex = /^(https?:\/\/)?([^/]+)\/@([^@/]+)@([^/]+)\/\d+$/
// Matches URLs like https://mastodon.social/@Tutanota/112077253275661088
const directMastodonUrlRegex = /^(https?:\/\/)?([^/]+)\/@([^@/]+)\/(\d+)$/

export function isMastodon(url: URL): boolean {
  // mastodon URLs look like twitter URLs but won't come from a twitter TLD
  return (
    !isTwitter(url) && (indirectMastodonUrlRegex.test(url.toString()) || directMastodonUrlRegex.test(url.toString()))
  )
}

export function assembleMastodonUserName(mastAccount: { acct: string; uri: string }): string {
  if (!mastAccount.acct.includes("@")) {
    const user = mastAccount.acct
    const instance = new URL(mastAccount.uri).hostname
    return `${user}@${instance}`
  }
  return mastAccount.acct
}

export const idBasedPlatforms: MediaPublisher[] = [MediaPublisher.YOUTUBE, MediaPublisher.FACEBOOK]

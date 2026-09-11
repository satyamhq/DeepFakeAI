import { MediaPublisher } from "@prisma/client"
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
        case MediaPublisher.TIKTOK: {
          const regexMatches = /tiktok\.com\/@(\w+)/.exec(postUrl)
          let userName: string | undefined = undefined
          // TikTok often but doesn't always have the username in the URL.
          // Sometimes the URL can be short forms like https://vm.tiktok.com/ZGeXpL7v4/,
          // and those need to be handled differently.
          if (regexMatches && regexMatches.length == 2) {
            userName = regexMatches[1]
          } else {
            // Our newest TikTok code has an `uploader` field with the username
            userName = (json as any).uploader as string
            // JSON extracted from our older tiktok code will have a `username` in the blob
            if (!userName) {
              userName = (json as any).result?.author?.username as string
              // Sometimes there's neither and just a `nickname`, which seems to match what's in the URL
              if (!userName) {
                userName = (json as any).result?.author?.nickname as string
              }
            }
          }
          // We didn't get anything useful, so don't fill in the source data for this media
          if (!userName) {
            return undefined
          }
          // Remove any leading @ (some saved blobs have this)
          if (userName.startsWith("@")) {
            userName = userName.substring(1)
          }
          // TikTok doesn't provide a unique ID for the user
          return {
            source: MediaPublisher.TIKTOK,
            sourceUserName: userName,
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
    } else if (isMastodon(parsed)) {
      // TODO: may not detect account/profile URLs
      return MediaPublisher.MASTODON
    } else if (isReddit(parsed)) {
      return MediaPublisher.REDDIT
    } else if (isTikTok(parsed)) {
      return MediaPublisher.TIKTOK
    } else if (isTwitter(parsed)) {
      return MediaPublisher.X
    } else if (isYouTube(parsed)) {
      return MediaPublisher.YOUTUBE
    }
  }
  return MediaPublisher.UNKNOWN
}

function isYouTube(url: URL): boolean {
  return url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")
}

function isTikTok(url: URL): boolean {
  return url.hostname.includes("tiktok.com")
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
// Will not match TikTok URLs like https://www.tiktok.com/@rufusisagoodboy/video/7364137201052978462
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

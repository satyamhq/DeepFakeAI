import { NextRequest } from "next/server"
import { determineSourcePlatform } from "../source"
import { MediaPublisher } from "@prisma/client"
import { db, ensureInternalUser } from "../../server"
import { canParseUrl, requireEnv, response } from "../util"
import { updateVerifiedMediaAfterDelete, updateVerifiedMediaAfterInsert } from "./actions"

export const dynamic = "force-dynamic"

// Extend the max runtime for this endpoint so the POST endpoint can churn through URLs and media
export const maxDuration = 300

type AddVerifiedSourceRequest = {
  urls: string[]
}

export async function GET(req: NextRequest) {
  const err = await ensureInternalUser(req)
  if (err) {
    return err
  }

  const sources = await db.verifiedSource.findMany({ orderBy: [{ platform: "desc" }, { platformId: "desc" }] })
  return response.make(200, { count: sources.length, sources })
}

/**
 * Accepts POST requests by authenticated users to add verified sources. The body is an array of profile URLs, e.g.
 * { "urls": ["https://www.facebook.com/nih.gov","https://www.youtube.com/user/USEPAgov","https://x.com/USDA"] }
 * The URLs can be from Facebook, Instagram, Twitter/X, TikTok, or YouTube.
 * They do not have to all be from the same platform.
 */
export async function POST(req: NextRequest) {
  const err = await ensureInternalUser(req)
  if (err) {
    return err
  }

  const body = (await req.json()) as AddVerifiedSourceRequest

  // Enforce a cap of 10 URLs per request to avoid hitting Vercel's timeout
  if (body.urls.length > 10) {
    return response.error(413, "request exceeds limit of 10 URLs")
  }

  const skipped = []
  const sources = []
  for (const url of body.urls) {
    switch (determineSourcePlatform(url)) {
      case MediaPublisher.FACEBOOK: {
        const maybeId = await getFacebookIdFromURL(url)
        if (maybeId) {
          const maybeName = await getFacebookPageNameById(maybeId)
          if (maybeName) {
            try {
              const created = await db.verifiedSource.create({
                data: {
                  platform: MediaPublisher.FACEBOOK,
                  platformId: maybeId,
                  displayName: maybeName,
                },
              })
              sources.push(created)
            } catch (e) {
              console.error(e)
              skipped.push(url)
            }
          } else {
            skipped.push(url)
          }
        } else {
          skipped.push(url)
        }
        break
      }
      case MediaPublisher.INSTAGRAM: {
        const maybePlatformId = /instagram.com\/(\w+)/.exec(url)
        if (maybePlatformId) {
          try {
            const created = await db.verifiedSource.create({
              data: {
                platform: MediaPublisher.INSTAGRAM,
                platformId: maybePlatformId[1],
              },
            })
            sources.push(created)
          } catch (e) {
            console.error(e)
            skipped.push(url)
          }
        } else {
          skipped.push(url)
        }
        break
      }
      case MediaPublisher.TIKTOK: {
        const maybePlatformId = /tiktok.com\/@(\w+)/.exec(url)
        if (maybePlatformId) {
          try {
            const created = await db.verifiedSource.create({
              data: {
                platform: MediaPublisher.TIKTOK,
                platformId: maybePlatformId[1],
              },
            })
            sources.push(created)
          } catch (e) {
            console.error(e)
            skipped.push(url)
          }
        } else {
          skipped.push(url)
        }
        break
      }
      case MediaPublisher.X: {
        const maybePlatformId = /(?:x|twitter)\.com\/(\w+)/.exec(url)
        if (maybePlatformId) {
          try {
            const created = await db.verifiedSource.create({
              data: {
                platform: MediaPublisher.X,
                platformId: maybePlatformId[1],
              },
            })
            sources.push(created)
          } catch (e) {
            console.error(e)
            skipped.push(url)
          }
        } else {
          skipped.push(url)
        }
        break
      }
      case MediaPublisher.YOUTUBE: {
        const channelId = await getYoutubeIdFromUrl(url)
        if (channelId) {
          const displayName = await getYoutubeNameFromUrl(url)
          try {
            const created = await db.verifiedSource.create({
              data: {
                platform: MediaPublisher.YOUTUBE,
                platformId: channelId,
                displayName: displayName,
              },
            })
            sources.push(created)
          } catch (e) {
            console.error(e)
            skipped.push(url)
          }
        } else {
          skipped.push(url)
        }
        break
      }
      default:
        skipped.push(url)
        break
    }
  }

  await updateVerifiedMediaAfterInsert(sources)

  return response.make(200, { sources, skipped })
}

export async function DELETE(req: NextRequest) {
  const err = await ensureInternalUser(req)
  if (err) {
    return err
  }

  const id = req.nextUrl.searchParams.get("id")

  if (!id) {
    return response.error(400, "id parameter missing")
  }

  try {
    const deleted = await db.verifiedSource.delete({ where: { id } })
    await updateVerifiedMediaAfterDelete(deleted)
    return response.make(200, { deleted })
  } catch (e: any) {
    if (e.code === "P2025") {
      return response.error(404, "source not found", { id })
    }
    console.error(e)
    return response.error(500, "error deleting verified source", e)
  }
}

// matches and captures the username for URLs like https://www.youtube.com/user/USEPAgov
const youtubeUserRegex = /youtube\.com\/user\/(\w+)/
// matches and captures the user handle for URLs like https://www.youtube.com/@USEPAgov
const youtubeHandleRegex = /youtube\.com\/@(\w+)/

/**
 * Asks the Google API for the channel ID of the given YouTube channel URL
 *
 * The response from Google looks something like:
 * {
 *    "kind": "youtube#channelListResponse",
 *    "etag": "rofFkm3ZP-oDbmwbDfTl82MfnTI",
 *    "pageInfo": {
 *        "totalResults": 1,
 *        "resultsPerPage": 5
 *    },
 *    "items": [
 *        {
 *            "kind": "youtube#channel",
 *            "etag": "s8RxqrXZ8xe0jC2pI3i6LlGps24",
 *            "id": "UClUC_8c_F3aBmwME-dNfvKg"
 *        }
 *    ]
 * }
 */
async function getYoutubeIdFromUrl(youtubeUrl: string): Promise<string | undefined> {
  const googleApiKey = requireEnv("GOOGLE_API_KEY")

  if (canParseUrl(youtubeUrl)) {
    const maybeCapturedUser = youtubeUserRegex.exec(youtubeUrl)
    if (maybeCapturedUser) {
      // if it matched, we captured a username too
      const username = maybeCapturedUser[1]
      const youtubeResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?key=${googleApiKey}&forUsername=${username}&part=id`,
      )
      if (youtubeResponse.ok) {
        const json = await youtubeResponse.json()
        return json.items[0]?.id
      }
    }
    const maybeCapturedHandle = youtubeHandleRegex.exec(youtubeUrl)
    if (maybeCapturedHandle) {
      // if it matched, we captured a handle too
      const handle = maybeCapturedHandle[1]
      const youtubeResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?key=${googleApiKey}&forHandle=${handle}&part=id`,
      )
      if (youtubeResponse.ok) {
        const json = await youtubeResponse.json()
        return json.items[0]?.id
      }
    }
  }
  return undefined
}

async function getYoutubeNameFromUrl(youtubeUrl: string): Promise<string | undefined> {
  if (canParseUrl(youtubeUrl)) {
    const maybeCapturedUser = youtubeUserRegex.exec(youtubeUrl)
    if (maybeCapturedUser) {
      // if it matched, we captured a username too
      return maybeCapturedUser[1]
    }
    const maybeCapturedHandle = youtubeHandleRegex.exec(youtubeUrl)
    if (maybeCapturedHandle) {
      // if it matched, we captured a handle too
      return maybeCapturedHandle[1]
    }
  }
  return undefined
}

/**
 * Uses Vetric's Facebook URL resolver to give us the ID of this account.
 */
async function getFacebookIdFromURL(facebookUrl: string): Promise<string | undefined> {
  const vetricApiKey = requireEnv("VETRIC_API_KEY")

  const vetricResponse = await fetch(`https://api.vetric.io/facebook/v1/url-resolver?url=${facebookUrl}`, {
    headers: {
      "x-api-key": vetricApiKey,
    },
  })

  if (!vetricResponse.ok) {
    console.error(await vetricResponse.text())
    return undefined
  }

  const json = await vetricResponse.json()

  // The API that comes next is for Users...
  if (json.data?.urlResolver?.__typename !== "User") {
    // TODO: IDK throw something maybe?
    console.warn(`${facebookUrl} not a User page`)
  }

  return json.data?.urlResolver?.id
}

/**
 * This gets the display name from the Facebook page.
 * Used for a friendly display name instead of the ID
 */
async function getFacebookPageNameById(id: string): Promise<string | undefined> {
  const vetricApiKey = requireEnv("VETRIC_API_KEY")

  const vetricResponse = await fetch(`https://api.vetric.io/facebook/v1/profiles/${id}/header`, {
    headers: {
      "x-api-key": vetricApiKey,
    },
  })

  if (!vetricResponse.ok) {
    console.error(await vetricResponse.text())
    return undefined
  }

  const json = await vetricResponse.json()

  return json.data?.user?.profile_header_renderer?.user?.name
}

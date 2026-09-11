import path from "path"
import { promises as fs } from "fs"
import { TwitterApi } from "twitter-api-v2"
import { NextRequest } from "next/server"
import { getServerRole } from "../../server"
import { response } from "../util"

export async function POST(req: NextRequest) {
  const role = await getServerRole()
  if (!role.internal)
    return response.make(403, JSON.stringify("Unauthorized: You do not have permission to perform this action."))

  const json = await req.json()
  const text = json.text ?? ""
  const shouldIncludeGraphic = json.shouldIncludeGraphic ?? false

  const appKey = process.env.TWITTER_CONSUMER_KEY
  const appSecret = process.env.TWITTER_CONSUMER_SECRET
  const accessToken = process.env.TWITTER_ACCESS_TOKEN_KEY
  const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET

  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    return response.make(500, JSON.stringify("Twitter credentials (consumer key/secret and access tokens) not fully configured."))
  }

  const client = new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  })

  try {
    let rsp
    if (shouldIncludeGraphic) {
      const filePath = path.resolve("./public/breaking-news.png")
      const file = await fs.readFile(filePath)
      const mediaId = await client.v1.uploadMedia(file, { type: "png" })
      rsp = await client.v2.tweet({ text, media: { media_ids: [mediaId] } })
    } else {
      rsp = await client.v2.tweet({ text })
    }
    return response.make(200, JSON.stringify(rsp.data.text))
  } catch (e: any) {
    console.log("Error posting to X:", e)
    return response.make(e.code, JSON.stringify(e.data.detail))
  }
}

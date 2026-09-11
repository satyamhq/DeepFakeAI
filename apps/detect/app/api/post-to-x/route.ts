import path from "path"
import { promises as fs } from "fs"
import { TwitterApi } from "twitter-api-v2"
import { NextRequest } from "next/server"
import { getServerRole } from "../../server"
import { requireEnv, response } from "../util"

export async function POST(req: NextRequest) {
  const role = await getServerRole()
  if (!role.internal)
    return response.make(403, JSON.stringify("Unauthorized: You do not have permission to perform this action."))

  const json = await req.json()
  const text = json.text ?? ""
  const shouldIncludeGraphic = json.shouldIncludeGraphic ?? false

  const client = new TwitterApi({
    appKey: requireEnv("TWITTER_CONSUMER_KEY"),
    appSecret: requireEnv("TWITTER_CONSUMER_SECRET"),
    accessToken: requireEnv("TWITTER_ACCESS_TOKEN_KEY"),
    accessSecret: requireEnv("TWITTER_ACCESS_TOKEN_SECRET"),
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

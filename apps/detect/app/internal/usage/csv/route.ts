import { dateSince, formatDateToTimestamp } from "../util"
import getUserQueries from "../actions"
import { getServerRole } from "../../../server"
import { NextRequest } from "next/server"
import { siteUrl } from "../../../site"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest): Promise<Response> {
  const role = await getServerRole()
  if (!role.user) return new Response("Must be logged in.", { status: 403 })
  const { searchParams } = new URL(request.url)
  const days = searchParams.get("days") || "0"

  const since = dateSince(days)
  const { byUser } = await getUserQueries(since)

  const rows: string[] = [["Analyzed Date", "User Email", "TrueMedia URL", "Media Source URL"].join(",")]
  Array.from(byUser.entries()).forEach(([email, posts]) => {
    posts.forEach((post) => {
      const time = formatDateToTimestamp(post.time)
      const trueMediaUrl = siteUrl + "/media/analysis?id=" + post.mediaId
      const postUrl = post.postUrl.replace(/,/g, "%2C")
      rows.push([time, email, trueMediaUrl, postUrl].join(","))
    })
  })
  const csvString = rows.join("\n")

  return new Response(csvString, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="user-queries.csv"',
    },
  })
}

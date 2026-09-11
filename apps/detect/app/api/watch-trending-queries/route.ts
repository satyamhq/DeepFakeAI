import * as Slack from "../../utils/Slack"

import { db } from "../../server"
import { response } from "../util"
import { siteUrl } from "../../site"

// prevent pre-rendering of this route
export const dynamic = "force-dynamic"

// minimum number of total queries to alert
const MIN_QUERIES_TO_ALERT = 3

export async function GET() {
  type QueryResult = {
    url: string
    hits: number
    maxtime: Date
  }
  const queryCounts: QueryResult[] = await db.$queryRaw`
    SELECT post_url AS url, COUNT(DISTINCT(user_id)) AS hits, MAX(time) AS maxtime 
    FROM queries q JOIN users u ON q.user_id = u.id
    WHERE time > NOW() - INTERVAL '7 days' AND u.email NOT LIKE '%@truemedia.org'
    GROUP BY post_url
    HAVING COUNT(DISTINCT(user_id)) >= ${MIN_QUERIES_TO_ALERT} AND MAX(time) > NOW() - INTERVAL '1 hour';
  `

  await Promise.all(
    queryCounts.map(async (queryCount) => {
      const postUrl = queryCount.url
      const count = queryCount.hits

      const postMedia = await db.postMedia.findFirst({
        where: { postUrl },
      })

      if (!postMedia?.mediaId) {
        console.warn(`No mediaId found for trending postUrl ${postUrl}, skipping`)
        return
      }

      const analysisUrl = `${siteUrl}/media/analysis?id=${postMedia.mediaId}`

      const message = `<${analysisUrl}|Analysis> of ${postUrl} has ${count} queries in the last 7 days`

      console.log(message)
      await Slack.postMessage(Slack.CHANNEL_TRENDING_QUERIES_ALERTS, message)
    }),
  )

  return response.make(200, {})
}

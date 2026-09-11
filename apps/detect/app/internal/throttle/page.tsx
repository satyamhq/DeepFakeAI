import { checkIsThrottled } from "../../throttle/actions"
import { throttleLimitForUserType } from "../../throttle/windowing"
import { db } from "../../server"
import { table } from "../ui"
import { UserType } from "@prisma/client"
import GatingConfigEditorLoader from "../components/gating/GatingConfigEditorLoader"

export const dynamic = "force-dynamic"

type MediaCount = {
  count: number
  userType: UserType
  windowStart: Date
}

async function getRecentMediaCounts(maxRows: number): Promise<MediaCount[]> {
  const rawRows: { count: bigint; user_type: UserType; window_start: Date }[] = await db.$queryRaw`
  SELECT 
    DATE_TRUNC('hour', m.resolved_at) AS window_start, 
    mt.user_type,
    count(am.*) AS count 
  FROM (SELECT DISTINCT media_id FROM analysis_results) AS am 
  JOIN media m ON am.media_id = m.id
  JOIN media_throttle mt ON m.id = mt.media_id
  WHERE mt.user_type IS NOT NULL
  GROUP BY mt.user_type, DATE_TRUNC('hour', m.resolved_at)
  ORDER BY window_start DESC  
  LIMIT ${maxRows}`

  return rawRows.map((row) => ({
    count: Number(row.count),
    userType: row.user_type,
    windowStart: row.window_start,
  }))
}

export default async function ThrottlePage() {
  const isApiThrottled = await checkIsThrottled(undefined, UserType.API)
  const isAnonThrottled = await checkIsThrottled(undefined, UserType.ANONYMOUS)
  const isUserThrottled = await checkIsThrottled(undefined, UserType.REGISTERED)
  const recentBuckets = await getRecentMediaCounts(100)
  return (
    <div className="flex gap-8">
      <div>
        <h1 className="mb-4 text-4xl font-extrabold">Throttle</h1>
        <div className="flex flex-row justify-start gap-2">
          <div className="mb-4 text">
            API:{" "}
            <span className={isApiThrottled ? "text-red-500" : "text-lime-400"}>{isApiThrottled ? "Yes" : "No"}</span>
          </div>
          <div className="mb-4 text">
            Registered Users:{" "}
            <span className={isUserThrottled ? "text-red-500" : "text-lime-400"}>{isUserThrottled ? "Yes" : "No"}</span>
          </div>
          <div className="mb-4 text">
            Anonymous Users:{" "}
            <span className={isAnonThrottled ? "text-red-500" : "text-lime-400"}>{isAnonThrottled ? "Yes" : "No"}</span>
          </div>
        </div>

        {table(
          recentBuckets,
          (entry) => entry.windowStart.toISOString(),
          ["Window start", "User Type", "Media count", "Was throttled"],
          [
            (entry) => <div>{entry.windowStart.toLocaleString()}</div>,
            (entry) => <div>{entry.userType}</div>,
            (entry) => <div>{entry.count}</div>,
            (entry) => {
              const overLimit = entry.count >= throttleLimitForUserType(entry.userType)
              return <div className={overLimit ? "text-red-500" : "text-lime-400"}>{overLimit ? "Yes" : "No"}</div>
            },
          ],
        )}
      </div>
      <div className="grow">
        <h1 className="mb-4 text-4xl font-extrabold">No Throttle Gating</h1>
        <p className="text-sm mb-4">
          Users who pass this gate are not subject to throttling and do not contribute to the throttle counts.
        </p>
        <GatingConfigEditorLoader gateKey="no-api-throttling" />
      </div>
    </div>
  )
}

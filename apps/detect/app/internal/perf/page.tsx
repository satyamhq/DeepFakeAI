import { db } from "../../server"
import { summarize } from "../summarize"
import Performance from "./Performance"

export const dynamic = "force-dynamic"

const DEFAULT_WEEKS = 5

export default async function Page({ searchParams }: { searchParams: { weeks: string } }) {
  let weeks = parseInt(searchParams.weeks ?? DEFAULT_WEEKS)
  weeks = isNaN(weeks) ? DEFAULT_WEEKS : Math.max(1, weeks)
  const today = new Date()
  // Add 1 to weeks to make sure we always fetch enough data
  const since = new Date(today.getTime() - (weeks + 1) * 7 * 24 * 60 * 60 * 1000)
  const media = await db.media.findMany({
    where: {
      meta: { isNot: null },
      resolvedAt: { gte: since },
    },
    include: { meta: true },
  })
  const msums = summarize(media)
  console.log(`Loaded media ${media.length}`)

  return (
    <>
      <Performance msums={msums} weeks={weeks} />
    </>
  )
}

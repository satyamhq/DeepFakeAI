import { pageNav } from "../ui"
import DateLabel from "../../components/DateLabel"
import DaysSelector from "./DaysSelector"
import UsersQueries from "./UsersQueries"
import getUserQueries from "./actions"
import { dateSince } from "./util"
import Link from "next/link"
import { Button } from "flowbite-react"

export const dynamic = "force-dynamic"

export default async function Page({ searchParams }: { searchParams: { days: string } }) {
  const since = dateSince(searchParams.days)
  const { media, byUser } = await getUserQueries(since)
  return (
    <>
      {pageNav("Usage")}
      <div className="flex flex-row gap-5 items-center mx-auto">
        Last ? Days:
        <DaysSelector days={searchParams.days ?? "0"} />
        <Link href={`/internal/usage/csv?days=${searchParams.days ?? "0"}`}>
          <Button>Download CSV</Button>
        </Link>
      </div>
      <div>
        <em>New</em> analyses since <DateLabel date={since} />: {media.length}
      </div>
      <div className="flex flex-col gap-5 mt-5">
        {Array.from(byUser).map(([user, posts]) => (
          <UsersQueries key={user} user={user} posts={posts} />
        ))}
      </div>
    </>
  )
}

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getServerRole } from "../../server"
import UserHistory from "./UserHistory"
import { searchParamToDate } from "../../utils/datetime"
import { signInUrl } from "../../site"
import { isUserAuthorizedToViewOrg } from "../../utils/clerk"
import { determineUserHistoryParams } from "./impersonation"
import { HistoryHeader } from "./HistoryHeader"

export const dynamic = "force-dynamic"

export default async function Page({
  searchParams,
}: {
  searchParams: {
    t: string
    filter: string
    q: string
    t0: string
    tf: string
    sort: "desc" | "asc"
    acc: string
    as: string
    allOrg: boolean
  }
}) {
  const role = await getServerRole()
  if (role.isNotLoggedIn) redirect(signInUrl)

  const authed = auth()
  const { as } = searchParams
  const allOrg = searchParams.allOrg ?? false

  if (!authed.userId) {
    console.warn(`GetUserHistory access denied: no user Id [userId=${authed.userId}, orgId=${authed.orgId} as=${as}]`)
    redirect("/")
  }

  const params = determineUserHistoryParams(authed.userId, authed.orgId ?? null, as)
  if (params.isImpersonating && !role.internal) {
    console.warn(`GetUserHistory access denied: not internal [userId=${authed.userId}, orgId=${authed.orgId} as=${as}]`)
    redirect("/")
  }

  if (params.orgId && !(await isUserAuthorizedToViewOrg(params.orgId))) {
    console.warn(`GetUserHistory access denied: not in org [userId=${authed.userId}, orgId=${authed.orgId} as=${as}]`)
    redirect("/")
  }

  const filter = searchParams.filter ?? "all"
  const query = searchParams.q ?? ""
  const timeStart = searchParamToDate(searchParams.t0)
  const timeEnd = searchParamToDate(searchParams.tf)
  const sortOrder = searchParams.sort ?? "desc"
  const accuracy = searchParams.acc ?? ""

  const { userId, orgId, isImpersonating } = params
  if (role.id === "clt7e36uq00005esi4d10phcy") {
    console.log(`GetUserHistory page.tsx [userId=${authed.userId}, orgId=${authed.orgId}, allOrg=${allOrg}, as=${as}]`)
  }

  const header = (
    <HistoryHeader
      userId={userId}
      orgId={orgId}
      allOrg={allOrg}
      isImpersonating={isImpersonating}
      accuracy={accuracy}
    />
  )

  // Individual model results are stored in the database as JSON. The "verdict" resulting from combinng the results
  // happens in the frontend. The definition of the relationship between results and verdict changes at the whims of ML
  // :). Since the verdict is not stored in the DB we must query all the queries and then filter down to show things
  // like "you have 5 media we ranked as low evidence of manipulation." Short story: take=1000 to get ALL user queries
  // filtered on the frontend.
  return (
    <UserHistory
      header={header}
      filter={filter}
      showFilters={true}
      query={query}
      timeStart={timeStart}
      timeEnd={timeEnd}
      sortOrder={sortOrder}
      accuracy={accuracy}
      userId={userId}
      orgId={orgId}
      as={as}
      allOrg={allOrg}
      isImpersonating={isImpersonating}
    />
  )
}

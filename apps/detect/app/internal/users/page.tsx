import { pageNav, pageLinks } from "../ui"
import SearchForm from "./SearchForm"
import { clerkClient } from "../../mockClerkServer"
import { getClerkUsers } from "./actions"
import ClerkUsersPage, { UserTableRow } from "./ClerkUsersPage"
import { GoToClerkUsersDashboard } from "../../components/GoToClerkDashboard"
import InviteUser from "./InviteUser"

export const dynamic = "force-dynamic"

export default async function Page({ searchParams }: { searchParams: { offset: string; q: string } }) {
  const skip = parseInt(searchParams.offset || "0")
  const take = 15
  const search = searchParams.q

  const { data, totalCount } = await getClerkUsers({ q: search, skip })
  // Map the Clerk response data into rows for the table
  const users = data.map((u: any): UserTableRow => {
    return {
      id: u.id,
      externalId: u.externalId ?? null,
      firstName: u.firstName ?? null,
      lastName: u.lastName ?? null,
      email: u.primaryEmailAddress?.emailAddress || "ERROR",
      location: (u.publicMetadata?.org as string) || null,
      banned: !!u.banned,
      createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
    }
  })

  const baseUrl = `/internal/users${search ? "?q=" + search : ""}`

  const userIdToOrgs: Record<string, { id: string; name: string }[]> = {}
  await Promise.all(
    users.map(async (user: UserTableRow) => {
      const orgs: any = await clerkClient().users.getOrganizationMembershipList({ userId: user.id })
      userIdToOrgs[user.id] = (orgs.data || []).map((org: any) => ({ id: org.organization?.id || "", name: org.organization?.name || "" }))
    }),
  )
  return (
    <>
      {pageNav("Users")}
      <GoToClerkUsersDashboard />
      <InviteUser />
      <hr className="my-8" />
      <div className="flex gap-10 items-baseline">
        <SearchForm q={search} />
        {pageLinks(baseUrl, skip, take, data.length, totalCount)}
      </div>
      <ClerkUsersPage users={users} userIdToOrgs={userIdToOrgs} />
    </>
  )
}

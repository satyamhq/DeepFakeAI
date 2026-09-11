import { pageNav, showText, table } from "../ui"
import { GoToClerkOrganizationsDashboard } from "../../components/GoToClerkDashboard"
import Link from "next/link"
import { clerkClient } from "@clerk/nextjs/server"
import { ClockIcon } from "../../components/icons"

export const dynamic = "force-dynamic"

export default async function Page() {
  const orgs = await clerkClient().organizations.getOrganizationList({ limit: 500 })
  return (
    <>
      <div className="mb-2 flex flex-row justify-between">
        <div>{pageNav("Organizations")}</div>
      </div>

      <GoToClerkOrganizationsDashboard />

      <div className="mt-2">{orgs.data.length} total organizations.</div>

      <div className="mt-4">
        {table(
          [{ name: "Anonymous Users", id: "anonymousanonymousanonymo" }, ...orgs.data],
          (org) => org.id,
          ["Organization", "History & F1"],
          [
            (org) => showText(org.name),
            (org) => (
              <div className="text-center">
                <Link href={`/media/history?as=${org.id}&allOrg=true`}>
                  <ClockIcon />
                </Link>
              </div>
            ),
          ],
        )}
      </div>
    </>
  )
}

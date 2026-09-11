import Link from "next/link"
import { pageNav } from "../ui"
import { db, getServerRole } from "../../server"
import { Button } from "flowbite-react"
import VerifiedSourcesTables from "./VerfiedSourcesTable"

export const dynamic = "force-dynamic"

export default async function Page() {
  const role = await getServerRole()
  const verifiedSources = await db.verifiedSource.findMany({
    orderBy: [{ platform: "desc" }, { displayName: "asc" }, { platformId: "asc" }],
  })
  return (
    <>
      <div className="mb-2 flex flex-row justify-between">
        <div>{pageNav("Verified Sources")}</div>
        {role.canEditMetadata && (
          <Link href={"/internal/verified-sources/manage"}>
            <Button color="lime" className="text-black">
              Add Verified Sources
            </Button>
          </Link>
        )}
      </div>
      <p>{verifiedSources.length} verified sources.</p>
      <div className="flex justify-center">
        <VerifiedSourcesTables verifiedSources={verifiedSources} canEdit={role.canEditMetadata} />
      </div>
    </>
  )
}

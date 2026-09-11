import { Button, TextInput } from "flowbite-react"
import { Suspense } from "react"
import { clerkClient } from "@clerk/nextjs/server"
import { pageNav } from "../ui"
import { getApiKeyRows } from "./apiKeyRows"
import ApiKeyTable from "./ApiKeyTable"
import { getApiKeysForUser } from "../../api/apiKey"

export const dynamic = "force-dynamic"

export default async function Page({ searchParams }: { searchParams: { email: string } }) {
  const email = searchParams.email ?? null
  return (
    <div className="flex flex-col gap-2">
      <div className="mb-2 flex flex-row justify-between">
        <div>{pageNav("API Keys")}</div>
      </div>
      <form className="flex flex-row gap-2">
        <div className="flex-grow">
          <TextInput
            type="email"
            name="email"
            defaultValue={email}
            placeholder="user@truemedia.org"
            helperText="Search for a user by email if you want to create an api key for them"
            tabIndex={1}
          />
        </div>
        <Button className="text-black self-start" color="lime" type="submit" tabIndex={2}>
          Search User
        </Button>
      </form>
      {email ? (
        <>
          <h2 className="text-lg my-2">API Keys for {email}</h2>
          <Suspense fallback={<div>Loading API Keys...</div>}>
            <ApiKeyTableForEmail email={email} />
          </Suspense>
        </>
      ) : (
        <div className="mt-2">
          <h2 className="text-lg my-2">All Existing API Keys</h2>
          <Suspense fallback={<div>Loading all API Keys...</div>}>
            <AllApiKeysTable />
          </Suspense>
        </div>
      )}
    </div>
  )
}

async function ApiKeyTableForEmail({ email }: { email: string }) {
  const users = await clerkClient().users.getUserList({ emailAddress: [email] })
  if (users.data.length === 0) {
    return <div>no user with this email found</div>
  }

  const clerkUser = users.data[0]
  const apiKeys = await getApiKeysForUser({ where: { userId: clerkUser.externalId } })
  const rows = await getApiKeyRows(apiKeys)
  const organizations = (
    await clerkClient().users.getOrganizationMembershipList({ userId: clerkUser.id })
  ).data.flatMap((o) => o.organization)
  for (const organization of organizations) {
    if (!apiKeys.find((apiKey) => apiKey.orgId === organization.id)) {
      rows.push({
        clerkUser: { id: clerkUser.id, externalId: clerkUser.externalId, fullName: clerkUser.fullName },
        apiKey: null,
        organization: { id: organization.id, name: organization.name },
        orgMemberActive: true,
      })
    }
  }
  if (!rows.find((r) => r.organization === null)) {
    rows.push({
      clerkUser: { id: clerkUser.id, externalId: clerkUser.externalId, fullName: clerkUser.fullName },
      apiKey: null,
      organization: null,
      orgMemberActive: false,
    })
  }
  return <ApiKeyTable showInternalAdmin={true} rows={rows} />
}

async function AllApiKeysTable() {
  const apiKeys = await getApiKeysForUser()
  const rows = await getApiKeyRows(apiKeys)
  return <ApiKeyTable showInternalAdmin={true} showUserColumn rows={rows} />
}

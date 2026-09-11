import { redirect } from "next/navigation"
import SwaggerUI from "swagger-ui-react"
import { auth, clerkClient } from "@clerk/nextjs/server"
import "swagger-ui-react/swagger-ui.css"
import { getSwaggerApiDocs } from "./getSwaggerApiDocs"
import ApiKeyTable from "../../internal/api-keys/ApiKeyTable"
import { activeApiKeyRows } from "./actions"

export default async function Page() {
  const { userId } = auth()
  if (!userId) redirect("/")
  const user = await clerkClient().users.getUser(userId)
  if (!user.externalId) redirect("/")

  const rows = await activeApiKeyRows(user.externalId)
  if (rows.length < 1) redirect("/")

  const spec = await getSwaggerApiDocs()
  return (
    <div>
      <div className="text-left text-3xl mb-5">API Keys</div>
      <ApiKeyTable showInternalAdmin={false} rows={rows} />

      <div className="bg-white overflow-hidden mt-8">
        <SwaggerUI spec={spec} defaultModelsExpandDepth={-1} />
      </div>
    </div>
  )
}

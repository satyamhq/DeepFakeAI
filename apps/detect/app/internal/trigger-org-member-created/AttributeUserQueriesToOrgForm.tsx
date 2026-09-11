"use client"

import { useOrganizationList, useUser } from "@clerk/nextjs"
import { Button, TextInput } from "flowbite-react"
import { useState } from "react"

export default function AttributeUserQueriesToOrgForm({
  triggerWebhook,
}: {
  triggerWebhook: (userId: string, orgId: string) => Promise<{ count: number }>
}) {
  const [state, setState] = useState("idle")
  const [response, setResponse] = useState("")

  const userId = useUser().user?.id ?? "Loading..."
  const memberships = useOrganizationList({ userMemberships: true })

  const handleSubmit = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    try {
      const formData = new FormData(ev.currentTarget)
      const userId = formData.get("userId") as string
      const orgId = formData.get("orgId") as string
      setState("loading")
      const { count } = await triggerWebhook(userId, orgId)
      setResponse(`${count} queries from userId=${userId} moved to orgId=${orgId}`)
      setState("idle")
    } catch (e) {
      setState("error")
      setResponse("" + e)
    }
  }

  return (
    <div>
      <div>Your User ID: {userId}</div>

      <br />

      <div>
        <div>Your orgs:</div>
        {(memberships.userMemberships?.data ?? []).map((membership) => {
          return (
            <div key={membership.id}>
              <div>{membership.organization.name}</div>
              <div>{membership.organization.id}</div>
              <br />
            </div>
          )
        })}
      </div>

      <form onSubmit={handleSubmit}>
        <div>
          User ID: <TextInput name="userId" />
        </div>
        <div>
          Org ID: <TextInput name="orgId" />
        </div>
        <div className="mt-2">
          <Button type="submit" color="lime">
            Submit
          </Button>
        </div>
      </form>

      <h1 className="font-bold text-lg">Result:</h1>
      {state === "idle" && <div>{response}</div>}
      {state === "loading" && <div>Loading...</div>}
      {state === "error" && <div className="text-red">{response}</div>}
    </div>
  )
}

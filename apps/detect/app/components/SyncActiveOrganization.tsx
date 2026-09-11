"use client"

import { useAuth } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import attributeUserQueriesToOrg from "../api/org-member-created/actions"

export function SyncActiveOrganization() {
  const { userId, orgId } = useAuth()

  // Set `savedOrgId` to some "initial" value.
  // Then a user may leave an org and orgId may be come `null`.
  // Then a user may join an org and it will change from `null` to a string.
  // When orgId changes from null to a string then we can attribute the queries
  // from the user to the user and the org.
  const [savedOrgId, setSavedOrgId] = useState<string | null | undefined>("initial")

  useEffect(() => {
    if (userId && savedOrgId === null && orgId !== null) {
      attributeUserQueriesToOrg(userId, orgId)
    }
    setSavedOrgId(orgId)
  }, [userId, orgId, savedOrgId])
  return null
}

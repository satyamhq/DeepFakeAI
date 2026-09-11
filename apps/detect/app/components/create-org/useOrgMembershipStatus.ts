"use client"

import { useUser } from "@clerk/nextjs"
import {
  ClerkPaginatedResponse,
  OrganizationMembershipResource,
  OrganizationSuggestionResource,
  UserOrganizationInvitationResource,
  UserResource,
} from "@clerk/types"
import { useEffect, useState } from "react"

/**
 * Hook to get information about the user's organization memberships,
 * including invitations and suggestions.
 */
export default function useOrgMembershipStatus():
  | { loading: true }
  | {
      loading: false
      memberships: OrganizationMembershipResource[]
      invitations: UserOrganizationInvitationResource[]
      suggestions: OrganizationSuggestionResource[]
      user: UserResource | null
    } {
  const { user, isLoaded, isSignedIn } = useUser()
  const [loading, setLoading] = useState(true)
  const [invites, setInvites] = useState<ClerkPaginatedResponse<UserOrganizationInvitationResource> | null>(null)
  const [suggestions, setSuggestions] = useState<ClerkPaginatedResponse<OrganizationSuggestionResource> | null>(null)
  useEffect(() => {
    if (user == null) return
    Promise.all([
      user.getOrganizationInvitations().then(setInvites),
      user.getOrganizationSuggestions().then(setSuggestions),
    ]).then(() => {
      setLoading(false)
    })
  }, [user])
  if (!isLoaded) return { loading: true }
  if (user == null || !isSignedIn)
    return { loading: false, memberships: [], invitations: [], suggestions: [], user: null }
  const memberships = user.organizationMemberships ?? []

  if (loading) {
    return { loading: true }
  }
  return { loading, memberships, invitations: invites?.data ?? [], suggestions: suggestions?.data ?? [], user }
}

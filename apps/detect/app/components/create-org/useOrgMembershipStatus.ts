"use client"

import {
  useUser,
  User,
  ClerkPaginatedResponse,
  OrganizationMembershipResource,
  OrganizationSuggestionResource,
  UserOrganizationInvitationResource,
} from "../../mockClerk"
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
      user: User | null
    } {
  const { user, isLoaded, isSignedIn } = useUser()
  const [loading, setLoading] = useState(true)
  const [invites, setInvites] = useState<ClerkPaginatedResponse<UserOrganizationInvitationResource> | null>(null)
  const [suggestions, setSuggestions] = useState<ClerkPaginatedResponse<OrganizationSuggestionResource> | null>(null)
  useEffect(() => {
    if (user == null) return
    const safeUser = user as User
    Promise.all([
      safeUser.getOrganizationInvitations().then(setInvites),
      safeUser.getOrganizationSuggestions().then(setSuggestions),
    ]).then(() => {
      setLoading(false)
    })
  }, [user])
  if (!isLoaded) return { loading: true }
  if (user == null || !isSignedIn)
    return { loading: false, memberships: [], invitations: [], suggestions: [], user: null }
  const memberships = (user as User).organizationMemberships ?? []

  if (loading) {
    return { loading: true }
  }
  return { loading, memberships, invitations: invites?.data ?? [], suggestions: suggestions?.data ?? [], user: user as User }
}

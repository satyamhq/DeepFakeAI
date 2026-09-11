"use client"

import React from "react"

export type User = {
  id: string
  externalId?: string | null
  firstName?: string | null
  lastName?: string | null
  fullName?: string | null
  imageUrl?: string
  primaryEmailAddress?: { emailAddress: string } | null
  emailAddresses?: Array<{ emailAddress: string }>
  publicMetadata?: Record<string, any>
  banned?: boolean
  createdAt?: number | Date
  reload?: () => Promise<void>
  getOrganizationInvitations: () => Promise<any>
  getOrganizationSuggestions: () => Promise<any>
  organizationMemberships?: any[]
}

export type UserResource = User
export type OrganizationMembershipResource = any
export type OrganizationSuggestionResource = any
export type UserOrganizationInvitationResource = any
export type ClerkPaginatedResponse<T = any> = { data: T[]; totalCount: number }

export const useUser = () => ({
  user: null as User | null,
  isLoaded: true,
  isSignedIn: false,
})

// Mock user with required methods for components that call them
export const mockUser: User = {
  id: "",
  getOrganizationInvitations: async () => ({ data: [], totalCount: 0 }),
  getOrganizationSuggestions: async () => ({ data: [], totalCount: 0 }),
  organizationMemberships: [],
}

export const useAuth = () => ({
  userId: null as string | null,
  sessionId: null as string | null,
  actor: null,
  orgId: null as string | null,
  orgRole: null as string | null,
  orgSlug: null as string | null,
  isLoaded: true,
  isSignedIn: false,
  has: () => false,
  getToken: async () => null,
  signOut: async () => {},
})

export const useOrganization = () => ({
  organization: null as { id: string; name: string; slug?: string } | null,
  isLoaded: true,
  membership: null,
})

export const useOrganizationList = (_opts?: any) => ({
  isLoaded: true,
  organizationList: [] as any[],
  userMemberships: {
    data: [] as Array<{ id?: string; organization: { id: string; name: string; slug?: string } }>,
    isLoading: false,
  },
  setActive: async () => {},
})

export const useSession = () => ({
  session: null,
  isLoaded: true,
  isSignedIn: false,
})

export const useClerk = () => ({
  loaded: true,
  user: null,
  session: null,
  client: null,
  signOut: async () => {},
  openSignIn: () => {},
  openSignUp: () => {},
  openUserProfile: () => {},
})

export const SignedIn = ({ children: _children }: { children?: React.ReactNode }) => null
export const SignedOut = ({ children }: { children?: React.ReactNode }) => <>{children}</>
export const UserButton = () => null
export const OrganizationSwitcher = (_props?: any) => null
export const SignIn = () => null
export const SignUp = () => null
export const CreateOrganization = () => null
export const ClerkProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>

export const auth = () => ({
  userId: null as string | null,
  sessionId: null as string | null,
  sessionClaims: null as { externalId?: string; email?: string } | null,
  orgId: null as string | null,
  orgRole: null as string | null,
  orgSlug: null as string | null,
  has: () => false,
  getToken: async () => null,
})

export const currentUser = async () => null

const mockClerkClientInstance = {
  users: {
    getUser: async () => null,
    getUserList: async () => ({ data: [], totalCount: 0 }),
    updateUserMetadata: async () => ({}),
    getOrganizationMembershipList: async () => ({ data: [], totalCount: 0 }),
  },
  organizations: {
    getOrganization: async () => null,
    getOrganizationList: async () => ({ data: [], totalCount: 0 }),
    getOrganizationMembershipList: async () => ({ data: [], totalCount: 0 }),
  },
}

export const clerkClient: any = Object.assign(
  () => mockClerkClientInstance,
  mockClerkClientInstance
)

export const clerkMiddleware = () => {
  return (_req: any) => null
}

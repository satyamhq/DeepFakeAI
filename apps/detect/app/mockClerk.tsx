"use client"

import React, { useEffect, useState } from "react"
import { getSupabaseBrowserClient } from "./supabase"

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

function mapSupabaseUser(sbUser: any): User | null {
  if (!sbUser) return null
  const email = sbUser.email || ""
  const fullName =
    sbUser.user_metadata?.full_name ||
    sbUser.user_metadata?.name ||
    (email ? email.split("@")[0] : "User")
  const parts = fullName.split(" ")
  const firstName = sbUser.user_metadata?.first_name || parts[0] || "User"
  const lastName = sbUser.user_metadata?.last_name || parts.slice(1).join(" ") || ""
  return {
    id: sbUser.id,
    externalId: sbUser.id,
    firstName,
    lastName,
    fullName,
    imageUrl: sbUser.user_metadata?.avatar_url || "",
    primaryEmailAddress: email ? { emailAddress: email } : null,
    emailAddresses: email ? [{ emailAddress: email }] : [],
    publicMetadata: sbUser.user_metadata || {},
    banned: false,
    createdAt: new Date(sbUser.created_at || Date.now()),
    reload: async () => {},
    getOrganizationInvitations: async () => ({ data: [], totalCount: 0 }),
    getOrganizationSuggestions: async () => ({ data: [], totalCount: 0 }),
    organizationMemberships: [],
  }
}

export const mockUser: User = {
  id: "",
  getOrganizationInvitations: async () => ({ data: [], totalCount: 0 }),
  getOrganizationSuggestions: async () => ({ data: [], totalCount: 0 }),
  organizationMemberships: [],
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const supabase = getSupabaseBrowserClient()
      let isMounted = true

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!isMounted) return
        setUser(session?.user ? mapSupabaseUser(session.user) : null)
        setIsLoaded(true)
      }).catch(() => {
        if (isMounted) setIsLoaded(true)
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isMounted) return
        setUser(session?.user ? mapSupabaseUser(session.user) : null)
        setIsLoaded(true)
      })

      return () => {
        isMounted = false
        subscription?.unsubscribe()
      }
    } catch {
      setIsLoaded(true)
    }
  }, [])

  return {
    user,
    isLoaded,
    isSignedIn: !!user,
  }
}

export function useAuth() {
  const { user, isLoaded, isSignedIn } = useUser()

  const signOut = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      await supabase.auth.signOut()
    } catch (err) {
      console.warn("Sign out notice:", err)
    }
    window.location.href = "/login"
  }

  return {
    userId: user?.id || null,
    sessionId: user ? `sess_${user.id}` : null,
    actor: null,
    orgId: null as string | null,
    orgRole: null as string | null,
    orgSlug: null as string | null,
    isLoaded,
    isSignedIn,
    has: () => false,
    getToken: async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        return session?.access_token || null
      } catch {
        return null
      }
    },
    signOut,
  }
}

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

export const useSession = () => {
  const { user, isLoaded, isSignedIn } = useUser()
  return {
    session: user ? { id: `sess_${user.id}`, user } : null,
    isLoaded,
    isSignedIn,
  }
}

export const useClerk = () => {
  const { user, isLoaded } = useUser()
  const { signOut } = useAuth()
  return {
    loaded: isLoaded,
    user,
    session: user ? { id: `sess_${user.id}` } : null,
    client: null,
    signOut,
    openSignIn: () => { window.location.href = "/login" },
    openSignUp: () => { window.location.href = "/signup" },
    openUserProfile: () => {},
  }
}

export const SignedIn = ({ children }: { children?: React.ReactNode }) => {
  const { isSignedIn, isLoaded } = useUser()
  if (!isLoaded || !isSignedIn) return null
  return <>{children}</>
}

export const SignedOut = ({ children }: { children?: React.ReactNode }) => {
  const { isSignedIn, isLoaded } = useUser()
  if (!isLoaded || isSignedIn) return null
  return <>{children}</>
}

export const UserButton = () => {
  const { user, isSignedIn } = useUser()
  const { signOut } = useAuth()
  if (!isSignedIn || !user) return null

  const initial = (user.fullName || user.primaryEmailAddress?.emailAddress || "U")[0].toUpperCase()

  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-lime-500 text-gray-950 font-bold flex items-center justify-center text-sm shadow">
        {initial}
      </div>
      <button
        onClick={signOut}
        title="Sign Out"
        className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 transition"
      >
        Sign Out
      </button>
    </div>
  )
}

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
    getUser: async (id?: string) => ({
      id: id || "",
      externalId: id || null,
      firstName: "User",
      lastName: "",
      fullName: "User",
      primaryEmailAddress: { emailAddress: "user@internal.detect" },
      emailAddresses: [{ emailAddress: "user@internal.detect" }],
      publicMetadata: {},
      banned: false,
      createdAt: Date.now(),
      getOrganizationInvitations: async () => ({ data: [], totalCount: 0 }),
      getOrganizationSuggestions: async () => ({ data: [], totalCount: 0 }),
      organizationMemberships: [],
    }),
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

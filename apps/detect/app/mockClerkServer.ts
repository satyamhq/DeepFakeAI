import { NextRequest, NextResponse } from "next/server"

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
  createdAt?: number
}

export const auth = () => ({
  userId: null as string | null,
  sessionId: null as string | null,
  sessionClaims: null as { externalId?: string; email?: string; org_id?: string } | null,
  orgId: null as string | null,
  orgRole: null as string | null,
  orgSlug: null as string | null,
  has: () => false,
  getToken: async () => null,
})

export const currentUser = async (): Promise<User | null> => null

export const getAuth = (_req: NextRequest) => auth()

export const buildClerkProps = () => ({})

const mockClerkClientInstance: any = {
  users: {
    getUser: async (_id: string): Promise<User> => ({
      id: _id,
      externalId: null,
      firstName: "DeepFakeAI",
      lastName: "User",
      fullName: "DeepFakeAI User",
      emailAddresses: [{ emailAddress: "user@deepfakeai.internal" }],
      primaryEmailAddress: { emailAddress: "user@deepfakeai.internal" },
      publicMetadata: {},
      banned: false,
      createdAt: Date.now(),
    }),
    getUserList: async () => ({ data: [] as any[], totalCount: 0 }),
    updateUser: async () => ({}),
    updateUserMetadata: async () => ({}),
    getOrganizationMembershipList: async () => ({ data: [] as any[], totalCount: 0 }),
  },
  organizations: {
    getOrganization: async () => null,
    getOrganizationList: async () => ({ data: [] as any[], totalCount: 0 }),
    getOrganizationMembershipList: async () => ({ data: [] as any[], totalCount: 0 }),
  },
  invitations: {
    createInvitation: async ({ emailAddress }: { emailAddress: string }) => ({
      id: "inv_" + Math.random().toString(36).substring(2),
      emailAddress,
    }),
  },
}

export const clerkClient: any = Object.assign(
  () => mockClerkClientInstance,
  mockClerkClientInstance
)

export const clerkMiddleware = (
  handler?: (auth: any, req: NextRequest) => any
) => {
  return async (req: NextRequest) => {
    if (handler) {
      return handler({ userId: null, orgId: null }, req)
    }
    return NextResponse.next()
  }
}

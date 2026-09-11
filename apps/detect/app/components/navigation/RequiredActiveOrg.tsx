import { OrganizationList, useAuth } from "@clerk/nextjs"
import { PropsWithChildren, useEffect, useState } from "react"
import { getUserMembershipCount } from "./actions"
import ClientSideRenderOnly from "../ClientSideRenderOnly"

export function RequiredActiveOrg({ children }: PropsWithChildren) {
  const [shouldSelectOrg, setShouldSelectOrg] = useState(true)
  const [hasMemberships, setHasMemberships] = useState(false)
  const { userId, orgId } = useAuth()

  useEffect(() => {
    if (orgId || !userId) return
    const fetchMembershipCount = async () => {
      // useOrganizationList has the wrong count after the user
      // has left their last org, so we call backend API instead.
      const count = await getUserMembershipCount(userId)
      const hasMembershipsNew = count > 0
      if (hasMembershipsNew !== hasMemberships) {
        setHasMemberships(hasMembershipsNew)
      }
    }
    fetchMembershipCount()
  }, [orgId, userId, hasMemberships])

  useEffect(() => {
    const shouldSelectOrgNew = !!userId && !orgId && hasMemberships
    if (shouldSelectOrgNew !== shouldSelectOrg) {
      setShouldSelectOrg(shouldSelectOrgNew)
    }
  }, [userId, orgId, hasMemberships, shouldSelectOrg])

  if (!shouldSelectOrg) {
    return children
  }

  return (
    <div className="grow flex justify-center items-center mt-20">
      <ClientSideRenderOnly>
        <OrganizationList hidePersonal={true} hideSlug={true} />
      </ClientSideRenderOnly>
    </div>
  )
}

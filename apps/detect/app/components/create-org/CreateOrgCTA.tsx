"use client"

import { Button, Card } from "flowbite-react"
import { ReactNode } from "react"
import useOrgMembershipStatus from "./useOrgMembershipStatus"
import CreateOrgButton from "./CreateOrgButton"

type CreateOrgCTAProps = {
  /**
   * What to render while the membership state is loading. Defaults to nothing.
   */
  loading?: ReactNode
  /**
   * What to render if the user is already an organization member. Defaults to nothing.
   */
  hasOrg?: ReactNode

  className?: string
}

/**
 * Renders a call to action to create an organization if
 * the user is not already a member of one.
 */
export default function CreateOrgCTA({ loading, hasOrg, className = "" }: CreateOrgCTAProps) {
  const orgStatus = useOrgMembershipStatus()
  if (orgStatus.loading) return loading
  const { user, memberships, invitations, suggestions } = orgStatus
  if (user == null || memberships.length > 0 || invitations.length > 0 || suggestions.length > 0) {
    return hasOrg
  }
  return (
    <Card className={`w-full text-center ${className}`}>
      <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Join Others at {user.publicMetadata.org || "Your Organization"}
      </h5>

      <p className="font-normal text-gray-700 dark:text-gray-400">
        Share search history and get prioritized human analyst verification when you invite team members.
      </p>
      <div className="flex flex-col items-center">
        <div className="flex gap-4 flex-row">
          <CreateOrgButton />
          <Button href="https://www.truemedia.org/for-teams" outline>
            Learn More
          </Button>
        </div>
      </div>
    </Card>
  )
}

"use client"

import { OrganizationSwitcher } from "@clerk/nextjs"
import useOrgMembershipStatus from "../../create-org/useOrgMembershipStatus"
import CreateOrgButton from "../../create-org/CreateOrgButton"

export default function OrgSwitcherButton() {
  const orgStatus = useOrgMembershipStatus()
  if (orgStatus.loading) return null
  const { user, memberships, invitations, suggestions } = orgStatus
  if (user == null || memberships.length > 0 || invitations.length > 0 || suggestions.length > 0) {
    return (
      <div className="p-2 hover:bg-gray-700 hover:rounded-lg">
        <OrganizationSwitcher
          hidePersonal
          afterLeaveOrganizationUrl="/"
          hideSlug
          appearance={{
            elements: {
              rootBox: { width: "100%" },
              organizationSwitcherTrigger: { width: "100%" },
              organizationPreview: { width: "100%" },
              organizationPreviewMainIdentifier: { color: "white", fontSize: "1rem" },
            },
          }}
        />
      </div>
    )
  }
  return (
    <div className="pb-2">
      <CreateOrgButton color="lime" className="w-full" />
    </div>
  )
}

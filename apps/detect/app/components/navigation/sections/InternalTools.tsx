"use client"

import Link from "next/link"
import { useContext, useState } from "react"
import { FaChevronDown } from "react-icons/fa6"
import { FaChevronRight } from "react-icons/fa"
import { FlowbiteBugIcon, FlowbiteBuildingIcon } from "../../icons"

import { DebugContext } from "../../DebugContext"
import { ToggleSwitch } from "flowbite-react"
import { NavItem } from "../Navigation"
import { useUser } from "@clerk/clerk-react"
import { getRoleByUser } from "../../../auth"

export default function InternalTools() {
  const { isSignedIn, user, isLoaded } = useUser()
  const { debug, setDebug } = useContext(DebugContext)
  const [isInternalNavExpanded, setIsInternalNavExpanded] = useState(true)

  const role = getRoleByUser(user)
  const isFriend = isLoaded && isSignedIn && role.friend

  if (!isFriend) return null
  return (
    <ul className="space-y-2 font-medium space-y-2 font-medium ">
      <Link href={"#"} onClick={() => setDebug(!debug)}>
        <NavItem icon={<FlowbiteBugIcon />}>
          <ToggleSwitch className="inline align-text-top" checked={debug} onChange={() => {}} />
        </NavItem>
      </Link>
      <Link href={"#"} onClick={() => setIsInternalNavExpanded(!isInternalNavExpanded)}>
        <NavItem icon={<FlowbiteBuildingIcon />}>
          Internal
          {isInternalNavExpanded ? (
            <FaChevronDown className="inline ml-4" />
          ) : (
            <FaChevronRight className="inline ml-4" />
          )}
        </NavItem>
      </Link>
      {isInternalNavExpanded && (
        <ul className="space-y-2 font-medium pb-4 mb-4 ml-4 space-y-2 font-medium">
          <Link prefetch={false} href="/internal/users">
            <NavItem>Users</NavItem>
          </Link>
          <Link prefetch={false} href="/internal/orgs">
            <NavItem>Organizations</NavItem>
          </Link>
          <Link prefetch={false} href="/internal/api-keys">
            <NavItem>API Keys</NavItem>
          </Link>
          <Link prefetch={false} href="/internal/queries">
            <NavItem>Queries by Time</NavItem>
          </Link>
          <Link prefetch={false} href="/internal/usage">
            <NavItem>Queries by User</NavItem>
          </Link>
          <Link prefetch={false} href="/internal/top-queries">
            <NavItem>Top Queries</NavItem>
          </Link>
          <Link prefetch={false} href="/internal/media">
            <NavItem>Media</NavItem>
          </Link>
          <Link prefetch={false} href="/internal/metadata">
            <NavItem>Media Metadata</NavItem>
          </Link>
          <Link prefetch={false} href="/internal/datasets">
            <NavItem>Data Catalog</NavItem>
          </Link>
          <Link prefetch={false} href="/internal/eval">
            <NavItem>Eval</NavItem>
          </Link>
          <Link prefetch={false} href="/internal/perf">
            <NavItem>Eval over Time</NavItem>
          </Link>
          <Link prefetch={false} href="/internal/model">
            <NavItem>Models</NavItem>
          </Link>
          <Link prefetch={false} href="/internal/reruns">
            <NavItem>Analysis Reruns</NavItem>
          </Link>
          <Link prefetch={false} href="/internal/media/notable">
            <NavItem>Notable Media</NavItem>
          </Link>
          <Link prefetch={false} href="/internal/verified-sources">
            <NavItem>Verified Sources</NavItem>
          </Link>
          <Link prefetch={false} href="/internal/scheduler">
            <NavItem>Scheduler</NavItem>
          </Link>
          <Link prefetch={false} href="/internal/throttle">
            <NavItem>Throttles</NavItem>
          </Link>
          {role.admin && (
            <Link prefetch={false} href="/internal/trigger-org-member-created">
              <NavItem>Trigger Org Webhook</NavItem>
            </Link>
          )}
        </ul>
      )}
    </ul>
  )
}

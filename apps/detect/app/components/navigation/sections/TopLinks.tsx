import Link from "next/link"
import { NavItem } from "../Navigation"
import { FaRegStar, FaCloudUploadAlt } from "react-icons/fa"
import { FaShuffle } from "react-icons/fa6"
import { AddFileIcon, ClockIcon, FlowbiteArrowUpRightFromSquare } from "../../icons"
import { useUser } from "@clerk/nextjs"
import { getRoleByUser } from "../../../auth"
import { useEffect, useState } from "react"
import { hasActiveApiKeys } from "../../../docs/api/actions"
import { roleAllowedToBatchUpload } from "../../../media/batch-upload/util"

export default function TopLinks() {
  const [hasApiKey, setHasApiKey] = useState(false)
  const { user } = useUser()
  const role = getRoleByUser(user)
  const enableBatchUpload = roleAllowedToBatchUpload({ role }) && !role.internal

  useEffect(() => {
    if (!user || !user.externalId) return
    // TODO: It's not ideal that hasApiKey is async on the client-side only,
    // as it means that the API link renders dynamically and the UI shifts
    hasActiveApiKeys(user.externalId).then(setHasApiKey)
  }, [user])

  return (
    <ul className="space-y-2 font-medium pb-4 mb-4 space-y-2 font-medium border-b border-gray-200 dark:border-gray-700">
      <Link prefetch={false} href={"/"}>
        <NavItem icon={<AddFileIcon />}>Query</NavItem>
      </Link>
      {role.isLoggedIn && (
        <Link prefetch={false} href="/media/history">
          <NavItem icon={<ClockIcon />}>History</NavItem>
        </Link>
      )}
      <Link prefetch={false} href={"/media/notable"}>
        <NavItem icon={<FaRegStar className="inline w-6 h-6" />}>Notable Deepfakes</NavItem>
      </Link>
      {hasApiKey && (
        <Link prefetch={false} href={"/docs/api"}>
          <NavItem icon={<FaShuffle className="inline w-6 h-6" />}>API</NavItem>
        </Link>
      )}
      {enableBatchUpload && (
        <Link prefetch={false} href={"/media/batch-upload"}>
          <NavItem icon={<FaCloudUploadAlt className="inline w-6 h-6" />}>Batch Upload</NavItem>
        </Link>
      )}
      <Link prefetch={false} href={"https://truemedia.org"}>
        <NavItem icon={<FlowbiteArrowUpRightFromSquare />}>About</NavItem>
      </Link>
    </ul>
  )
}

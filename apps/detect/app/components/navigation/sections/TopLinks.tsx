import Link from "next/link"
import { NavItem } from "../Navigation"
import { FaRegStar } from "react-icons/fa"
import { FiInfo } from "react-icons/fi"
import { RiHistoryLine } from "react-icons/ri"
import { AddFileIcon } from "../../icons"
import { SignedIn } from "../../../mockClerk"

export default function TopLinks() {
  return (
    <ul className="space-y-2 font-medium pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
      <Link prefetch={false} href={"/"}>
        <NavItem icon={<AddFileIcon />}>Query</NavItem>
      </Link>
      <SignedIn>
        <Link prefetch={false} href={"/media/history"}>
          <NavItem icon={<RiHistoryLine className="inline w-6 h-6" />}>My History</NavItem>
        </Link>
      </SignedIn>
      <Link prefetch={false} href={"/media/notable"}>
        <NavItem icon={<FaRegStar className="inline w-6 h-6" />}>Notable Deepfakes</NavItem>
      </Link>
      <Link prefetch={false} href={"/about"}>
        <NavItem icon={<FiInfo className="inline w-6 h-6" />}>About</NavItem>
      </Link>
    </ul>
  )
}

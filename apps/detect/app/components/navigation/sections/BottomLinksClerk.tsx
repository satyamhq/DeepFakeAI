import Link from "next/link"
import { NavItem } from "../Navigation"
import { FlowbiteClipboardIcon, FlowbiteLayersIcon, FlowbiteLifeSaverIcon } from "../../icons"
import { privacyUrl, termsUrl, contactUrl } from "../../../site"

export default function BottomLinksClerk() {
  return (
    <>
      <div className="pt-4 md:mt-4 space-y-2 font-medium md:border-t border-gray-200 dark:border-gray-700">
        <Link prefetch={false} href={privacyUrl}>
          <NavItem icon={<FlowbiteClipboardIcon />}>Privacy Policy</NavItem>
        </Link>
        <Link prefetch={false} href={termsUrl}>
          <NavItem icon={<FlowbiteLayersIcon />}>Terms of Use</NavItem>
        </Link>
        <Link prefetch={false} href={contactUrl}>
          <NavItem icon={<FlowbiteLifeSaverIcon />}>Help &amp; Contact</NavItem>
        </Link>
      </div>
      <div className="p-2 text-gray-400 text-sm">
        <span>© 2026 DeepFakeAI</span>
      </div>
    </>
  )
}

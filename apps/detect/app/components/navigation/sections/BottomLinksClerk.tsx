import Link from "next/link"
import { FiGift } from "react-icons/fi"
import { FaUser } from "react-icons/fa"
import { NavItem } from "../Navigation"
import { FlowbiteClipboardIcon, FlowbiteLayersIcon, FlowbiteLifeSaverIcon } from "../../icons"
import { privacyUrl, termsUrl, contactUrl } from "../../../site"
import { SignedIn, UserButton, SignedOut, SignInButton } from "@clerk/nextjs"
import ClientSideRenderOnly from "../../ClientSideRenderOnly"
import OrgSwitcherButton from "./OrgSwitcherButton"

export default function BottomLinksClerk() {
  return (
    <>
      <div className="pt-4 md:mt-4 space-y-2 font-medium md:border-t border-gray-200 dark:border-gray-700">
        <ClientSideRenderOnly>
          <SignedIn>
            <div className="p-2 pb-0 hover:bg-gray-700 hover:rounded-lg">
              <UserButton
                appearance={{
                  elements: {
                    rootBox: { width: "100%" },
                    userButtonTrigger: { width: "100%" },
                    userButtonBox: { flexFlow: "row-reverse", justifyContent: "flex-end", width: "100%" },
                    userButtonOuterIdentifier: {
                      fontSize: "1rem",
                      paddingLeft: "0",
                      textAlign: "left",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    },
                  },
                }}
                showName
              />
            </div>
            <OrgSwitcherButton />
          </SignedIn>
          <SignedOut>
            <SignInButton>
              <button className="w-full text-left">
                <NavItem icon={<FaUser className="inline w-6 h-6" />}>Sign In</NavItem>
              </button>
            </SignInButton>
          </SignedOut>
        </ClientSideRenderOnly>

        <Link prefetch={false} href={"https://givebutter.com/yPpxLZ"}>
          <NavItem icon={<FiGift className="inline w-6 h-6" />}>Donate</NavItem>
        </Link>
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
      <div className="p-2 text-gray-400">
        <span>©2024</span>{" "}
        <Link prefetch={false} href={"https://truemedia.org"} className="underline">
          TrueMedia.org
        </Link>
      </div>
    </>
  )
}

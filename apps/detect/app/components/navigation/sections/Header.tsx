import Link from "next/link"

import NavigationToggle from "../NavigationToggle"
import Share from "../Share"
import DeepFakeAILogo from "../../DeepFakeAILogo"
import { SignedIn, SignedOut, UserButton } from "../../../mockClerk"

export default function Header() {
  return (
    <header className="flex flex-row items-center justify-between fixed top-0 left-0 right-0 h-20 border-b border-gray-600 py-4 sm:px-4 px-2 bg-gray-800 gap-5 z-50">
      <NavigationToggle />
      <Link prefetch={false} href="/" className="flex justify-center items-center space-x-3">
        <DeepFakeAILogo size="sm" />
      </Link>
      <div className="grow"></div>
      <div className="flex items-center gap-3">
        <Share />
        <SignedIn>
          <UserButton />
        </SignedIn>
        <SignedOut>
          <Link
            href="/login"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-lime-500 hover:bg-lime-400 text-gray-950 transition shadow"
          >
            Sign In
          </Link>
        </SignedOut>
      </div>
    </header>
  )
}

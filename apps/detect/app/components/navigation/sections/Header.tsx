import Link from "next/link"

import NavigationToggle from "../NavigationToggle"
import Share from "../Share"
import TrueMediaLogo from "../../TrueMediaLogo"

export default function Header() {
  return (
    <header className="flex flex-row items-center justify-between fixed top-0 left-0 right-0 h-20 border-b border-gray-600 py-4 sm:px-4 px-2 bg-gray-800 gap-5 z-50">
      <NavigationToggle />
      <Link prefetch={false} href="/" className="flex justify-center items-center space-x-3">
        <TrueMediaLogo size="sm" />
      </Link>
      <div className="grow"></div>
      <Share />
    </header>
  )
}

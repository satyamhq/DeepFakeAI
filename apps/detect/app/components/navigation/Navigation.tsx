"use client"

import { useContext, useState } from "react"
import { RiExpandLeftLine } from "react-icons/ri"
import { IoMdClose } from "react-icons/io"
import { NavigationContext } from "./NavigationContext"
import InternalTools from "./sections/InternalTools"
import TopLinks from "./sections/TopLinks"
import Header from "./sections/Header"
import BottomLinksClerk from "./sections/BottomLinksClerk"
import { RequiredActiveOrg } from "./RequiredActiveOrg"

export const NavItem = ({ icon, children }: { icon?: React.ReactNode; children?: React.ReactNode }) => (
  <div className="p-2 hover:bg-gray-700 hover:rounded-lg">
    {icon && <span className="text-gray-400">{icon}</span>}
    {children && <span className="ms-3">{children}</span>}
  </div>
)

function LeftSidebar({ children }: { children: React.ReactNode }) {
  const { isNavigationExpanded, toggleIsNavigationExpanded } = useContext(NavigationContext)
  const logoutStaysInBottomLeft = true

  // Permanently open on desktop (md:block) by default. On mobile, toggled with isNavigationExpanded.
  const hidden = isNavigationExpanded === false ? "hidden" : isNavigationExpanded ? "block" : "hidden md:block"
  const marginLeft = isNavigationExpanded === false ? "" : "md:ml-64"

  return (
    <div className="mt-20 flex-1 min-w-0 w-full">
      {/* Mobile Backdrop */}
      {isNavigationExpanded && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => toggleIsNavigationExpanded()}
        />
      )}
      <div
        className={`${hidden} w-64 fixed mt-20 top-0 left-0 bottom-0 bg-gray-50 dark:bg-gray-800 border-r border-gray-700/60 p-2 z-50 transition-all duration-200`}
      >
        <div className="flex flex-col h-full">
          <div className="shrink-0">
            <TopLinks />
          </div>
          {logoutStaysInBottomLeft ? (
            <>
              <div className="grow overflow-y-auto">
                <InternalTools />
              </div>
              <div className="shrink-0 mt-auto bottom-0">
                <BottomLinksClerk />
              </div>
            </>
          ) : (
            <div className="grow overflow-y-auto">
              <InternalTools />
              <BottomLinksClerk />
            </div>
          )}
        </div>
      </div>
      <div className={`${marginLeft} min-w-0 max-w-full transition-all duration-200`}>{children}</div>
    </div>
  )
}

function RightSidebar({ header, children }: { header: string; children: React.ReactNode }) {
  const [isRightExpanded, setIsRightExpanded] = useState(true)
  return (
    <aside
      id="default-sidebar"
      className="hidden xl:flex flex-col hidden h-100 bg-gray-50 dark:bg-gray-800 transition-transform -translate-x-full sm:translate-x-0 mt-20"
      aria-label="Sidebar"
    >
      {!isRightExpanded ? (
        <div
          className="flex flex-col mb-10 p-4 hover:cursor-pointer hover:bg-gray-700"
          onClick={() => setIsRightExpanded(true)}
        >
          <RiExpandLeftLine />
        </div>
      ) : (
        <div className="max-w-80 rounded-lg mt-8 xl:mt-0 xl:rounded-none flex flex-col bg-gray-700 p-4">
          <div className="flex justify-between pb-4 uppercase text-sm text-gray-400">
            <div className="">{header}</div>
            <div
              onClick={() => setIsRightExpanded(false)}
              className="hidden xl:block text-lg cursor-pointer hover:text-gray-100"
            >
              <IoMdClose />
            </div>
          </div>
          {children}
        </div>
      )}
    </aside>
  )
}

export default function Navigation({
  children,
  contentRight,
}: {
  children: React.ReactNode
  contentRight?: React.ReactNode
}) {
  return (
    <>
      <Header />
      <div className="flex flex-grow">
        <LeftSidebar>
          <div className="flex grow">
            <RequiredActiveOrg>{children}</RequiredActiveOrg>
          </div>
        </LeftSidebar>
        {contentRight && <RightSidebar header={"Notable Deepfakes"}>{contentRight}</RightSidebar>}
      </div>
    </>
  )
}

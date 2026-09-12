"use client"

import { createContext, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import useBreakpoint from "../useBreakpoint"

interface NavigationContextData {
  isNavigationExpanded: boolean | undefined
  toggleIsNavigationExpanded: () => void
}

export const NavigationContext = createContext<NavigationContextData>({
  isNavigationExpanded: true,
  toggleIsNavigationExpanded: () => {},
})

export function NavigationProvider({ children }: { children: React.ReactNode; isLoggedIn?: boolean }) {
  const breakpoint = useBreakpoint()
  const pathname = usePathname()
  const isMobile = breakpoint === "sm"

  // Permanently open by default on desktop.
  const [isNavigationExpanded, setIsNavigationExpanded] = useState<boolean | undefined>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("deepfakeai_sidebar_expanded")
      if (saved !== null) {
        return saved === "true"
      }
      return window.innerWidth >= 768
    }
    return true
  })

  // Sync state on resize/hydration
  useEffect(() => {
    if (!isMobile) {
      const saved = localStorage.getItem("deepfakeai_sidebar_expanded")
      if (saved === null) {
        setIsNavigationExpanded(true)
      }
    } else {
      // Mobile drawer closed by default
      setIsNavigationExpanded(false)
    }
  }, [isMobile])

  // Only close mobile overlay on route change. NEVER close desktop sidebar on route change!
  useEffect(() => {
    if (isMobile) {
      setIsNavigationExpanded(false)
    }
  }, [pathname, isMobile])

  const toggleIsNavigationExpanded = () => {
    setIsNavigationExpanded((prev) => {
      const nextState = prev === undefined ? false : !prev
      if (!isMobile && typeof window !== "undefined") {
        localStorage.setItem("deepfakeai_sidebar_expanded", String(nextState))
      }
      return nextState
    })
  }

  return (
    <NavigationContext.Provider value={{ isNavigationExpanded, toggleIsNavigationExpanded }}>
      {children}
    </NavigationContext.Provider>
  )
}

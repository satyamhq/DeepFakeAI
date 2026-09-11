"use client"

import { createContext, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import useBreakpoint from "../useBreakpoint"

interface NavigationContextData {
  isNavigationExpanded: boolean | undefined
  toggleIsNavigationExpanded: () => void
}

export const NavigationContext = createContext<NavigationContextData>({
  isNavigationExpanded: false,
  toggleIsNavigationExpanded: () => {},
})

export function NavigationProvider({ children, isLoggedIn }: { children: React.ReactNode; isLoggedIn: boolean }) {
  const breakpoint = useBreakpoint()

  // If the user is signed in, we default navigation expanded to `undefined`,
  // which means "rely on CSS to show or hide navigation depending on the browser width",
  // but then if the user toggles navigation on or off, we override that.
  // If the user is NOT signed in, we default navigation to hidden.
  const defaultValue = !isLoggedIn ? false : undefined
  const [isNavigationExpanded, setIsNavigationExpanded] = useState<boolean | undefined>(defaultValue)
  // If isLoggedIn changes, update navigation state.
  useEffect(() => {
    setIsNavigationExpanded(!isLoggedIn ? false : undefined)
  }, [isLoggedIn])

  const pathname = usePathname()
  useEffect(() => {
    // If we navigate to a new route *and* we're on a mobile device (breakpoint is `sm`), clear out the navigation
    // expanded state so that the navigation is the default state (hidden) again when we arrive at the new route.
    if (breakpoint === "sm") setIsNavigationExpanded(undefined)
  }, [pathname, breakpoint])

  const toggleIsNavigationExpanded = () =>
    setIsNavigationExpanded((prevIsExpanded) => {
      // Here we have to "do the right thing" when the user clicks the navigation button for the first time. At that
      // point isNavigationExpanded will be undefined and we have to transition to "yes expanded" on mobile, and "not
      // expanded" on desktop
      return !(prevIsExpanded === undefined ? breakpoint !== "sm" : prevIsExpanded)
    })

  return (
    <NavigationContext.Provider value={{ isNavigationExpanded, toggleIsNavigationExpanded }}>
      {children}
    </NavigationContext.Provider>
  )
}

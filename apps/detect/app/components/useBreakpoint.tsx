"use client"

import { useState, useEffect } from "react"
import resolveConfig from "tailwindcss/resolveConfig"
import * as tailwindConfig from "../../tailwind.config"

// Initial useScreenSize hook sourced from here:
// https://medium.com/@josephat94/building-a-simple-react-hook-to-detect-screen-size-404a867fa2d2
export function useScreenSize() {
  // initialize the state to an invalid screen size
  // intentionally make it invalid because this is executed on the server before the screen exists.
  const [screenSize, setScreenSize] = useState({
    width: -1,
    height: -1,
  })

  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    // Set the initial screen size once.
    handleResize()

    // Then also set the screen size any time the screen is resized.
    window.addEventListener("resize", handleResize)

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return screenSize
}

// Tailwind CSS breakpoints defined here:
// https://tailwindcss.com/docs/responsive-design
export default function useBreakpoint() {
  const { width } = useScreenSize()
  const fullConfig = resolveConfig(tailwindConfig)

  // The screen can have an invalid width of "-1" when useScreenSize is initialized on the server before the screen exists.
  if (width === -1) {
    return "unknown"
  } else if (width <= parseInt(fullConfig.theme.screens.sm)) {
    return "sm"
  } else if (width <= parseInt(fullConfig.theme.screens.md)) {
    return "md"
  } else if (width <= parseInt(fullConfig.theme.screens.lg)) {
    return "lg"
  } else if (width <= parseInt(fullConfig.theme.screens.xl)) {
    return "xl"
  } else {
    return "2xl"
  }
}

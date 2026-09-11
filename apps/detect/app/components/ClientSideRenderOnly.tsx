"use client"

import { ReactNode, useEffect, useState } from "react"

/**
 * Wraps child components with something to *only* mount them on the Client side.
 * This is necessary to avoid hydration errors when using Clerk with Next.js
 * See: https://discord.com/channels/856971667393609759/1271146443775676426/1271159690658713601
 */
export default function ClientSideRenderOnly({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Wait for the component to mount after React hydrates
  if (!isMounted) {
    return null
  }

  return children
}

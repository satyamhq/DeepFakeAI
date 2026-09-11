"use client"

import { createContext, useState, useEffect } from "react"

interface DebugContextData {
  debug: boolean
  setDebug: (d: boolean) => void
}

export const DebugContext = createContext<DebugContextData>({
  debug: false,
  setDebug: () => {},
})

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [debug, setDebugState] = useState(false)
  useEffect(() => {
    setDebugState(window.localStorage.getItem("debug") == "true")
  }, [])
  function setDebug(debug: boolean) {
    setDebugState(debug)
    window.localStorage.setItem("debug", `${debug}`)
  }
  return <DebugContext.Provider value={{ debug, setDebug }}>{children}</DebugContext.Provider>
}

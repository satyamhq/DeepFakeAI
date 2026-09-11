"use client"

import { useContext } from "react"
import { FaBug, FaBugSlash } from "react-icons/fa6"
import { DebugContext } from "./DebugContext"

export default function DebugToggle() {
  const { debug, setDebug } = useContext(DebugContext)

  return (
    <div className="cursor-pointer">
      {debug ? (
        <FaBug className="w-6 h-6" onClick={() => setDebug(false)} />
      ) : (
        <FaBugSlash className="w-6 h-6" onClick={() => setDebug(true)} />
      )}
    </div>
  )
}

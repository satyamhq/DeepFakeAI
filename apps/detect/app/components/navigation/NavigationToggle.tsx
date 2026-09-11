"use client"

import { useContext } from "react"
import { NavigationContext } from "./NavigationContext"
import { FlowbiteBarsIcon } from "../icons"

export default function NavigationToggle() {
  const { toggleIsNavigationExpanded } = useContext(NavigationContext)

  return (
    <span
      className="cursor-pointer hover:bg-gray-700 hover:rounded-lg p-2"
      onClick={() => toggleIsNavigationExpanded()}
    >
      <FlowbiteBarsIcon />
    </span>
  )
}

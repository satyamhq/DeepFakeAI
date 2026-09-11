"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

/**
 * Hook to update the search params in the URL.
 */
export default function useUpdateSearchParams() {
  const path = usePathname()
  const params = useSearchParams()
  const router = useRouter()

  const update = useCallback(
    (updater: (oldParams: URLSearchParams) => void) => {
      const newParams = new URLSearchParams(params)
      updater(newParams)
      router.push(`${path}?${newParams}`)
    },
    [path, params, router],
  )
  return update
}

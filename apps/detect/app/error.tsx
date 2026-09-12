"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "flowbite-react"

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[App Root Error Boundary]:", error)
  }, [error])

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg p-8 rounded-2xl border border-gray-700 bg-gray-800/95 shadow-2xl text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-950/60 border border-red-700/80 flex items-center justify-center text-red-400 text-2xl font-bold">
          !
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-gray-300 mb-6 text-sm">
          An unexpected error occurred while rendering this page. You can try reloading or returning to the main dashboard.
        </p>
        <div className="flex justify-center items-center gap-4">
          <Button onClick={() => reset()} className="bg-lime-500 hover:bg-lime-400 text-gray-950 font-semibold" color="lime">
            Try Again
          </Button>
          <Link
            href="/"
            className="px-4 py-2.5 rounded-lg border border-gray-600 hover:bg-gray-700 text-gray-200 text-sm font-medium transition"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}

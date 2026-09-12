"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "flowbite-react"

export default function HistoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[History Page Error Boundary]:", error)
  }, [error])

  return (
    <div className="w-full max-w-2xl mx-auto my-12 p-8 rounded-2xl border border-gray-700 bg-gray-800/90 shadow-xl text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-950/70 border border-red-800 flex items-center justify-center text-red-400 text-xl font-bold">
        !
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">History Temporarily Unavailable</h2>
      <p className="text-gray-400 mb-6 text-sm">
        We encountered an issue loading your history. Your stored queries and analyses are safe.
      </p>
      <div className="flex justify-center gap-4">
        <Button onClick={() => reset()} className="bg-lime-500 hover:bg-lime-400 text-gray-950 font-semibold" color="lime">
          Try Again
        </Button>
        <Link href="/" className="px-4 py-2.5 rounded-lg border border-gray-600 hover:bg-gray-700 text-gray-300 text-sm font-medium transition">
          Return Home
        </Link>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { getLocalStorageHistory, LocalHistoryItem } from "./local-history"
import AnonymousUserHistoryList from "./AnonymousRecentSearchList"
import Link from "next/link"
import { ArrowRightIcon } from "../../components/icons"
import { signUpUrl } from "../../site"

export default function AnonymousRecentSearches() {
  const [localHistory, setLocalHistory] = useState<LocalHistoryItem[]>([])
  useEffect(() => {
    setLocalHistory(getLocalStorageHistory())
  }, [])

  return (
    <div className="w-full">
      <div className="flex mb-4 w-full justify-start items-baseline gap-3">
        <h1 className="text-2xl font-bold">Recent searches</h1>
        <div className="text-lime-500">
          <Link href={signUpUrl}>
            Create an account to save full history <ArrowRightIcon />
          </Link>
        </div>
      </div>
      <div className="w-full flex rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800 flex-col">
        <div className="flex h-full flex-col justify-top p-6">
          <AnonymousUserHistoryList items={localHistory} />
        </div>
      </div>
    </div>
  )
}

"use client"

import Link from "next/link"
import { ArrowRightIcon } from "../../components/icons"
import UserHistoryList from "./UserHistoryList"
import UserHistoryFilters from "./UserHistoryFilters"
import { getUserHistory, UserQuery } from "./actions"
import { UserHistoryExportButton } from "../../components/ExportCSVButton"
import PrecisionRecallF1 from "./PrecisionRecallF1"
import { useUser } from "../../mockClerk"
import { getRoleByUser } from "../../auth"
import { useCallback, useEffect, useState } from "react"
import { Spinner } from "flowbite-react"
import { useSearchParams } from "next/navigation"

export default function UserHistory({
  header,
  hideZeroResults = false,
  showSeeAll = false,
  showFilters = false,
  filter = "all",
  query,
  timeStart,
  timeEnd,
  sortOrder = "desc",
  accuracy,
  userId,
  orgId,
  as,
  allOrg,
  isImpersonating,
}: {
  header: React.ReactNode
  // This allows us to hide the history entirely on the homepage.
  hideZeroResults?: boolean
  showSeeAll?: boolean
  showFilters: boolean
  filter: string
  query: string
  timeStart?: Date
  timeEnd?: Date
  sortOrder: "desc" | "asc"
  accuracy?: string
  userId: string | null
  orgId: string | null
  as: string | null
  allOrg: boolean
  isImpersonating: boolean
}) {
  const { user, isLoaded } = useUser()
  const role = getRoleByUser(user)
  const searchParams = useSearchParams()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [history, setHistory] = useState<UserQuery[]>([])
  const [tallyScores, setTallyScores] = useState<Record<string, number>>({})

  const fetchHistory = useCallback(async () => {
    setError("")
    setIsLoading(true)
    try {
      const userHistory = await getUserHistory({
        take: 20_000,
        filter,
        query,
        timeStart,
        timeEnd,
        sortOrder,
        accuracy,
        userId,
        orgId,
        allOrg,
        isImpersonating,
      })

      if (!userHistory) {
        setError("Error loading history. Refresh to try again.")
        setHistory([])
        setTallyScores({})
        return
      }

      const { history: hItems = [], tallyScores: tScores = {} } = userHistory
      setHistory(hItems)
      setTallyScores(tScores)
    } catch (err: any) {
      console.warn("[UserHistory] Exception fetching history:", err?.message || err)
      setError("Unable to load history. Please click Retry.")
      setHistory([])
      setTallyScores({})
    } finally {
      setIsLoading(false)
    }
  }, [filter, query, timeStart, timeEnd, sortOrder, accuracy, userId, orgId, allOrg, isImpersonating])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory, searchParams])

  // If unauthenticated both on server and client, show login prompt
  if (isLoaded && !user && !userId && role.isNotLoggedIn) {
    return (
      <div className="p-8 text-center text-gray-400">
        You must be logged in to view your detection history.
      </div>
    )
  }

  if (!isLoading && hideZeroResults && history.length === 0) return null

  return (
    <>
      <div className="flex mb-4 w-full justify-between">
        <h1 className="text-4xl font-bold">
          <Link href="/media/history">{header}</Link>
        </h1>
        {showFilters && (
          <UserHistoryExportButton
            filter={filter}
            query={query}
            timeStart={timeStart}
            timeEnd={timeEnd}
            userId={userId}
            orgId={orgId}
            allOrg={allOrg}
            isImpersonating={isImpersonating}
          />
        )}

        {showSeeAll && (
          <div className="ml-4 text-lime-500 place-content-center">
            <Link href="/media/history">
              See all <ArrowRightIcon />
            </Link>
          </div>
        )}
      </div>

      {role.internal && as && (
        <div className="w-full">
          <PrecisionRecallF1 as={as} allOrg={allOrg} selectedAccuracy={accuracy} tallyScores={tallyScores} />
        </div>
      )}

      <div className="w-full flex rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800 flex-col">
        <div className="flex h-full flex-col justify-top p-6">
          {showFilters && (
            <div className="flex gap-6">
              <div className="grow">
                <UserHistoryFilters
                  tally={tallyScores}
                  filteredCount={history.length}
                  currentFilter={filter}
                  query={query}
                  timeStart={timeStart}
                  timeEnd={timeEnd}
                  sortOrder={sortOrder}
                  allOrg={allOrg}
                  isImpersonating={isImpersonating}
                />
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="mt-12 text-center py-8">
              <Spinner size="xl" />
              <div className="mt-2 text-sm text-gray-400">Loading your history...</div>
            </div>
          ) : error ? (
            <div className="mt-8 text-center p-6 bg-red-950/30 rounded-lg border border-red-900/50">
              <div className="text-red-400 font-medium mb-3">{error}</div>
              <button
                type="button"
                onClick={fetchHistory}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition"
              >
                Retry
              </button>
            </div>
          ) : (
            <UserHistoryList items={history} allOrg={allOrg} />
          )}

          {showSeeAll && (
            <div className="pt-8 ml-4 text-lime-500 text-center">
              <Link href="/media/history">
                See all <ArrowRightIcon />
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

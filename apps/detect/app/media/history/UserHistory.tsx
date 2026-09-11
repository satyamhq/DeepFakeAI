"use client"

import Link from "next/link"
import { ArrowRightIcon } from "../../components/icons"
import UserHistoryList from "./UserHistoryList"
import UserHistoryFilters from "./UserHistoryFilters"
import { getUserHistory, UserQuery } from "./actions"
import { UserHistoryExportButton } from "../../components/ExportCSVButton"
import PrecisionRecallF1 from "./PrecisionRecallF1"
import { useUser } from "@clerk/nextjs"
import { getRoleByUser } from "../../auth"
import { useEffect, useState } from "react"
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
  header: JSX.Element
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
  const { user } = useUser()
  const role = getRoleByUser(user)
  const searchParams = useSearchParams()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [history, setHistory] = useState<UserQuery[]>([])
  const [tallyScores, setTallyScores] = useState<Record<string, number>>({})

  useEffect(() => {
    const get = async () => {
      setError("")
      setIsLoading(true)
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

      setIsLoading(false)

      if (!userHistory) {
        const msg = `getUserHistory no user history [userHistory=${userHistory}]`
        console.error(msg)
        setError("Error loading history. Refresh to try again.")
        setHistory([])
        setTallyScores({})
        return
      }

      const { history, tallyScores } = userHistory
      setHistory(history)
      setTallyScores(tallyScores)
    }

    get()
  }, [searchParams, filter, query, timeStart, timeEnd, sortOrder, accuracy, userId, orgId, allOrg, isImpersonating])

  // Don't display history if a user isn't logged in
  if (role.isNotLoggedIn) return "You must be logged in to view user history."

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
            <div className="mt-12 text-center">{isLoading && <Spinner />}</div>
          ) : error ? (
            <div className="mt-8 text-center text-red-500">{error}</div>
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

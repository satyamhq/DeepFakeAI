"use client"

import Link from "next/link"
import { ArrowRightIcon } from "../../components/icons"
import UserHistoryList from "./UserHistoryList"
import { getUserHistory, UserQuery } from "./actions"
import { useOrganization, useUser } from "@clerk/nextjs"
import { Spinner } from "flowbite-react"
import { useEffect, useState } from "react"

export function HomepageUserHistory() {
  const [history, setHistory] = useState<UserQuery[]>([])
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false)

  const user = useUser()
  const org = useOrganization()
  const userId = user?.user?.id ?? null
  const orgId = org?.organization?.id ?? null

  useEffect(() => {
    if (user.isLoaded && org.isLoaded) {
      getUserHistory({
        userId,
        orgId,
        allOrg: false,
        take: 10,
        filter: "all",
        query: "",
        sortOrder: "desc",
        isImpersonating: false,
      }).then((res) => {
        setHistory(res.history)
        setIsHistoryLoaded(true)
      })
    }
  }, [user.isLoaded, userId, org.isLoaded, orgId])

  if (!isHistoryLoaded) {
    return <Spinner />
  }

  if (history.length === 0) {
    return null
  }

  const seeAllHistoryUrl = "/media/history"
  return (
    <div>
      <div className="flex mb-4 w-full justify-between">
        <h1 className="text-4xl font-bold">
          <Link href="/media/history">History</Link>
        </h1>
        <div className="ml-4 text-lime-500 place-content-center">
          <Link href={seeAllHistoryUrl}>
            See all <ArrowRightIcon />
          </Link>
        </div>
      </div>
      <div className="w-full flex rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800 flex-col">
        <div className="flex h-full flex-col justify-top p-6">
          <UserHistoryList items={history} allOrg={false} />
          <div className="pt-8 ml-4 text-lime-500 text-center">
            <Link href={seeAllHistoryUrl}>
              See all <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

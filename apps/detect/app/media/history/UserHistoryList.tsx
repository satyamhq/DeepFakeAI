"use client"

import { useEffect, useState } from "react"
import { Button, Spinner } from "flowbite-react"
import UserHistoryItem, { UserHistoryHeader } from "./UserHistoryItem"
import { UserQuery, deleteUserHistoryItemAction } from "./actions"
import CreateOrgCTA from "../../components/create-org/CreateOrgCTA"

const NoResults = () => <div className="mt-8 text-gray-400 py-6 text-center">No history results found.</div>
const NoOrgResults = () => (
  <div className="mt-8">
    <CreateOrgCTA className="dark:bg-gray-700" loading={<Spinner />} hasOrg={<div className="text-gray-400 py-6 text-center">No organization history results found.</div>} />
  </div>
)

// Prevent too many items from being visible on the page by only showing the first `limit` items.
const Results = ({
  items,
  limit,
  onDelete,
}: {
  items: UserQuery[]
  limit: number
  onDelete: (mediaId: string, postUrl: string) => void
}) => {
  return (
    <>
      <UserHistoryHeader />
      {(items || []).map((item, index) => {
        if (!item || index >= limit) return null
        const key = `${item.mediaId || "m"}_${item.postUrl || index}`
        return (
          <UserHistoryItem
            key={key}
            userEmail={item.userEmail || ""}
            postUrl={item.postUrl || ""}
            mediaId={item.mediaId || ""}
            mimeType={item.mimeType || "application/octet-stream"}
            verdict={item.verdict || "unknown"}
            time={item.queriedAt}
            sourcePlatform={item.sourcePlatform}
            score={item.score}
            isFallback={item.isFallback}
            onDelete={onDelete}
          />
        )
      })}
    </>
  )
}

export default function UserHistoryList({ items, allOrg }: { items: UserQuery[]; allOrg: boolean }) {
  const pageSize = 15
  const [limit, setLimit] = useState(pageSize)
  const [historyItems, setHistoryItems] = useState<UserQuery[]>(items || [])

  // Safely keep in sync with parent items updates via useEffect
  useEffect(() => {
    setHistoryItems(items || [])
  }, [items])

  const handleDelete = async (mediaId: string, postUrl: string) => {
    // Optimistic removal
    setHistoryItems((current) => current.filter((it) => !(it.mediaId === mediaId && it.postUrl === postUrl)))
    try {
      const res = await deleteUserHistoryItemAction(mediaId, postUrl)
      if (!res.success) {
        console.warn("Failed to delete history item:", res.error)
      }
    } catch (err) {
      console.error("Delete history action error:", err)
    }
  }

  const increaseLimit = () => setLimit(limit + pageSize)
  const hasMore = limit < historyItems.length

  if (historyItems.length === 0) return allOrg ? <NoOrgResults /> : <NoResults />

  return (
    <>
      <Results items={historyItems} limit={limit} onDelete={handleDelete} />
      {hasMore && (
        <div className="items-center mt-4">
          <Button onClick={increaseLimit} className="w-full bg-lime-500 hover:bg-lime-400 text-gray-950 font-bold" color="lime">
            See More
          </Button>
        </div>
      )}
    </>
  )
}

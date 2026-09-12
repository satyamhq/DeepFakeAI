"use client"

import { useState } from "react"
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
      {items.map((item, index) => {
        if (index > limit) return null
        return (
          <UserHistoryItem
            key={`${item.mediaId}_${item.postUrl}`}
            userEmail={item.userEmail}
            postUrl={item.postUrl}
            mediaId={item.mediaId}
            mimeType={item.mimeType}
            verdict={item.verdict}
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
  const [historyItems, setHistoryItems] = useState<UserQuery[]>(items)

  // Keep in sync with parent items updates
  const [prevItems, setPrevItems] = useState(items)
  if (items !== prevItems) {
    setPrevItems(items)
    setHistoryItems(items)
  }

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

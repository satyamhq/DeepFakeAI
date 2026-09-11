"use client"

import { useState } from "react"
import { Button, Spinner } from "flowbite-react"
import UserHistoryItem, { UserHistoryHeader } from "./UserHistoryItem"
import { UserQuery } from "./actions"
import CreateOrgCTA from "../../components/create-org/CreateOrgCTA"

const NoResults = () => <div className="mt-8 w-max">No results.</div>
const NoOrgResults = () => (
  <div className="mt-8">
    <CreateOrgCTA className="dark:bg-gray-700" loading={<Spinner />} hasOrg={<div>No results.</div>} />
  </div>
)

// Prevent too many items from being visible on the page by only show the first `limit` items.
const Results = ({ items, limit }: { items: UserQuery[]; limit: number }) => {
  return (
    <>
      <UserHistoryHeader />
      {items.map(({ userEmail, postUrl, mediaId, mimeType, verdict, queriedAt }, index) => {
        return index > limit ? null : (
          <UserHistoryItem
            userEmail={userEmail}
            key={mediaId}
            postUrl={postUrl}
            mediaId={mediaId}
            mimeType={mimeType}
            verdict={verdict}
            time={queriedAt}
          />
        )
      })}
    </>
  )
}

export default function UserHistoryList({ items, allOrg }: { items: UserQuery[]; allOrg: boolean }) {
  const pageSize = 15
  const [limit, setLimit] = useState(pageSize)

  const increaseLimit = () => setLimit(limit + pageSize)
  const hasMore = limit < items.length

  if (items.length === 0) return allOrg ? <NoOrgResults /> : <NoResults />
  return (
    <>
      <Results items={items} limit={limit} />
      {hasMore && (
        <div className="items-center">
          <Button onClick={increaseLimit} className="w-full mt-4" color="lime">
            See More
          </Button>
        </div>
      )}
    </>
  )
}

"use client"

import { useState } from "react"
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa"
import { PostLink, mkLink } from "../ui"
import DateLabel from "../../components/DateLabel"
import { Data } from "./actions"
import Link from "next/link"
import { ANONYMOUS_USER_ID, ANONYMOUS_USER_NAME } from "../../../instrumentation"

const ShownPosts = 5

export default function UsersQueries({ user, posts }: { user: string; posts: Data[] }) {
  const [expanded, setExpanded] = useState(false)

  const shownPosts = expanded ? posts : posts.slice(0, ShownPosts)
  const moreCount = posts.length - ShownPosts
  const showMore = !expanded && moreCount > 0
  const userDisplay = user === ANONYMOUS_USER_ID ? ANONYMOUS_USER_NAME : user
  const viewUserLink =
    user === ANONYMOUS_USER_ID
      ? `/media/history?as=${ANONYMOUS_USER_ID}`
      : `/internal/users?q=${encodeURIComponent(user)}`

  return (
    <div>
      <span>
        <b className="mr-0">{userDisplay}</b> (
        <Link className="underline" href={viewUserLink}>
          view user
        </Link>
        )
      </span>
      {shownPosts.map((post) => (
        <div key={`${user}:${post.postUrl}:${post.mediaId}`} className="flex flex-row gap-2 items-center">
          <DateLabel date={post.time} /> &bull;
          {post.reviewed ? <FaRegEye /> : <FaRegEyeSlash />}
          {post.reviewers.length > 0 && (
            <>
              <span className="text-xs">{post.reviewers.join(", ")}</span>
            </>
          )}
          {mkLink(`/media/analysis?id=${post.mediaId}`, "Analysis")} &bull;
          <PostLink className="break-all" postUrl={post.postUrl} />
        </div>
      ))}
      {showMore && (
        <a className="underline" onClick={() => setExpanded(true)}>
          ({moreCount} more...)
        </a>
      )}
    </div>
  )
}

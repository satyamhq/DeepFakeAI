"use client"

import Link from "next/link"
import SiteIcons from "../../components/SiteIcons"
import QueryLimitReachedModal from "./QueryLimitReachedModal"
import { Button } from "flowbite-react"

export default function FailureUI({
  reason,
  details,
  postUrl,
  isQueryLimitReached,
}: {
  reason: string
  details?: string
  postUrl: string
  isQueryLimitReached: boolean
}) {
  return (
    <>
      <QueryLimitReachedModal show={isQueryLimitReached} />
      <div className="flex flex-col justify-center my-auto">
        <div className="text-gray-500">
          <b>Unable to locate media:</b>
        </div>
        <div className="text-lg max-w-xl">{reason}</div>

        <div className="mt-5 p-4 rounded-xl bg-gray-800 border border-gray-700 max-w-xl">
          <div className="text-gray-300 mb-3">
            Tip: You can download the media file directly and use our <b>Upload Media</b> tab on the home page.
          </div>
          <Link href="/">
            <Button color="lime">Go to Upload Tab</Button>
          </Link>
        </div>

        <div className="h-5"></div>
        {details && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            Debug details:
            <br />
            {details}
          </div>
        )}
        <div className="mt-5">
          <div className="mb-3">
            <b>Currently supported sites:</b>
          </div>
          <SiteIcons />
        </div>
        <div className="mt-5">
          <b>Your URL:</b>
        </div>
        <Link className="underline text-gray-500 max-w-xl text-wrap break-all" target="_blank" href={postUrl}>
          {postUrl}
        </Link>
      </div>
    </>
  )
}

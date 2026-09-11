"use client"

import Link from "next/link"
import SiteIcons from "../../components/SiteIcons"
import QueryLimitReachedModal from "./QueryLimitReachedModal"
import { SignedIn, SignedOut } from "@clerk/nextjs"
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

        <SignedIn>
          <div className="text-lg mt-5">
            Consider downloading the image or video and uploading it to TrueMedia.org directly.
          </div>
        </SignedIn>

        <SignedOut>
          <div className="mt-5">
            <Link href="/signup">
              <Button color="lime">Create an Account</Button>
            </Link>
          </div>
        </SignedOut>

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

"use client"

import { Button, Card, Tabs, TextInput } from "flowbite-react"
import UploadFile from "./media/upload/UploadFile"
import { IoMdSend } from "react-icons/io"
import SiteIcons from "./components/SiteIcons"
import { FormEvent, useState } from "react"
import { useAuth, useOrganization, useUser } from "@clerk/nextjs"
import { getRoleByUser } from "./auth"
import { signUpUrl } from "./site"
import { isPostUrlInAllowList } from "./media/resolve/util"
import { ArrowRightIcon } from "./components/icons"
import Link from "next/link"

function URLSubmissionCard() {
  const { userId } = useAuth()
  const orgId = useOrganization().organization?.id
  const [url, setUrl] = useState("")
  const [isAnonymousUnsupportedSource, setIsAnonymousUnsupportedSource] = useState(false)

  const handleSubmit = (ev: FormEvent<HTMLFormElement>) => {
    if (!userId && url !== "" && !isPostUrlInAllowList(url)) {
      ev.preventDefault()
      setIsAnonymousUnsupportedSource(true)
    } else {
      setIsAnonymousUnsupportedSource(false)
    }
  }

  return (
    <Card className="mb-5 border-t-0 rounded-tl-none rounded-tr-none">
      <InnerAccentContainer>
        <div className="text-lime-1000 pb-1 font-semibold">Add social media post</div>
        <form className="flex gap-1" method="get" action="/media/resolve" onSubmit={handleSubmit}>
          <TextInput
            className="flex-grow rounded-md bg-gray-900"
            id="url"
            name="url"
            placeholder="Add a URL..."
            value={url}
            onChange={(ev) => setUrl(ev.target.value)}
          />
          <input type="hidden" name="orgId" value={orgId} />
          <button
            type="submit"
            className="px-4 relative select-none transition-all disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none rounded-lg text-slate-300 hover:bg-slate-900 active:bg-slate-900 bg-brand-green-dark-500"
          >
            <div className="inline">
              <span className="hidden xs:inline">Analyze</span>
              <IoMdSend className="inline ml-2 w-7 h-7" />
            </div>
          </button>
        </form>
      </InnerAccentContainer>
      {isAnonymousUnsupportedSource && (
        <div>
          <div className="float-left">
            <div className="text-red-500">Unsupported source.</div>
          </div>
          <div className="float-right">
            <div className="text-lime-500">
              <Link href={signUpUrl}>
                Create an account to analyze unsupported sources. <ArrowRightIcon />
              </Link>
            </div>
          </div>
        </div>
      )}
      <div className="text-slate-400 mt-3 md:mt-6">
        <div className="mb-3 uppercase text-gray-200 text-xs">Supported sources</div>
        <SiteIcons />
      </div>
    </Card>
  )
}

export function InnerAccentContainer({ children }: { children: React.ReactNode }) {
  return <div className="dark:bg-lime-600 rounded-lg p-4 pl-7 pb-8">{children}</div>
}

function AnonymousUploadTab() {
  return (
    <Card className="mb-5 py-16 gap-0 border-t-0 rounded-tl-none rounded-tr-none">
      <div className="max-w-[50%] m-auto flex flex-col items-center gap-6 text-center">
        You need an account to upload your own audio, video, and image files.
        <Button className="w-48" href={signUpUrl}>
          Create Free Account
        </Button>
      </div>
    </Card>
  )
}

export default function QueryPageTabs() {
  const { user } = useUser()
  const role = getRoleByUser(user)

  return (
    <Tabs style="fullWidth" className="gap-0">
      <Tabs.Item title="Social Media Posts">
        <URLSubmissionCard />
      </Tabs.Item>
      <Tabs.Item title="Upload Media">
        {role.isLoggedIn && <UploadFile />}
        {role.isNotLoggedIn && <AnonymousUploadTab />}
      </Tabs.Item>
    </Tabs>
  )
}

"use client"

import { Card, Tabs, TextInput } from "flowbite-react"
import UploadFile from "./media/upload/UploadFile"
import { IoMdSend } from "react-icons/io"
import SiteIcons from "./components/SiteIcons"
import { FormEvent, useState } from "react"

function URLSubmissionCard() {
  const [url, setUrl] = useState("")

  const handleSubmit = (ev: FormEvent<HTMLFormElement>) => {
    if (!url.trim()) {
      ev.preventDefault()
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

export default function QueryPageTabs() {
  return (
    <Tabs style="fullWidth" className="gap-0">
      <Tabs.Item title="Social Media Posts">
        <URLSubmissionCard />
      </Tabs.Item>
      <Tabs.Item title="Upload Media">
        <UploadFile />
      </Tabs.Item>
    </Tabs>
  )
}


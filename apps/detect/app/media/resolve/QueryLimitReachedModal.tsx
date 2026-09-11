"use client"

import { Button, Modal } from "flowbite-react"
import { ReactNode } from "react"
import { FlowbiteBellRingingIcon } from "../../components/icons"
import { signUpUrl } from "../../site"

function TextBullet({
  className,
  title,
  subtext,
  icon,
}: {
  className?: string
  title: string
  subtext?: string
  icon: ReactNode
}) {
  return (
    <div className={`${className} flex flex-col gap-1`}>
      <div className="flex flex-row gap-2">
        <div className="w6 min-w-6">{icon}</div>
        <h2 className="grow font-bold text-xl">{title}</h2>
      </div>
      <div className="flex flex-row gap-2">
        <div className="w6 min-w-6" />
        <div className="grow text-gray-400">{subtext}</div>
      </div>
    </div>
  )
}

export default function QueryLimitReachedModal({ show }: { show: boolean }) {
  return (
    <Modal show={show} size="l">
      <Modal.Body>
        <div className="flex flex-row justify-stretch items-stretch my-12">
          <div className="flex flex-col w-full justify-center gap-8">
            <h2 className="text-4xl font-bold">Website limit reached</h2>
            <TextBullet
              title="We limit searches for the general public"
              subtext="We limit queries for all visitors without an account to control costs."
              icon={<FlowbiteBellRingingIcon className="fill-blue-500" />}
            />
            <TextBullet
              title="Create an account for more queries"
              subtext="Make more queries, see your history, and build a team with an account."
              icon={<FlowbiteBellRingingIcon className="fill-blue-500" />}
            />
          </div>
          <div className="flex flex-col w-full justify-stretch">
            <div className="font-bold text-lg">Non-profit, non-partisan, free.</div>
            <Button className="w-48" href={signUpUrl}>
              Create Free Account
            </Button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  )
}

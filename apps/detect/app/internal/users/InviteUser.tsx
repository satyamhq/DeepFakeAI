"use client"

import { useState, useRef } from "react"
import { useFormStatus } from "react-dom"
import { Button, TextInput } from "flowbite-react"
import { normalizeEmail, validateEmail } from "./manage/util"
import { inviteUser } from "./manage/actions"
import { useUser } from "@clerk/nextjs"
import { getRoleByUser } from "../../auth"
import { MdExpandLess, MdExpandMore } from "react-icons/md"

export default function InviteUser() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { user } = useUser()
  const role = getRoleByUser(user)

  const formRef = useRef<HTMLFormElement>(null)
  const { pending } = useFormStatus()
  const [message, setMessage] = useState("")

  async function onSubmit(data: FormData) {
    const email = normalizeEmail(((data.get("email") as string) ?? "").trim())

    if (process.env.NODE_ENV !== "production" && !email?.includes("@truemedia.org")) {
      // This is to prevent unintended invites to our Clerk Development environment
      setMessage("Unable to send invites to external users from non-production builds")
      return
    }

    const error = validateEmail(email)
    if (error) setMessage(error)
    else {
      formRef.current?.reset()
      const rsp = await inviteUser(email)
      switch (rsp.type) {
        case "error":
          setMessage(rsp.message)
          break
        case "invited":
          setMessage(`User invited: ${email}`)
          break
      }
    }
  }

  if (!role.admin) return null

  return (
    <div className="flex flex-col mt-8">
      <div className="font-bold text-xl mb-2">
        Invite User
        {isExpanded ? (
          <MdExpandLess className="ml-1 inline cursor-pointer" onClick={() => setIsExpanded(false)} />
        ) : (
          <MdExpandMore className="ml-1 inline cursor-pointer" onClick={() => setIsExpanded(true)} />
        )}
      </div>
      {isExpanded && (
        <>
          <div>
            Users can freely sign up without an invitation. You can optionally send someone an invitation by entering
            their email address here:
          </div>
          <form ref={formRef} action={onSubmit} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-row gap-4">
              <TextInput
                type="text"
                id="email"
                name="email"
                required
                placeholder={"Email address"}
                className="text-l rounded-md border-gray-300 shadow-sm focus:border-lime-500 focus:ring-lime-500 min-w-96"
              />
              <Button color="lime" className="text-nowrap" type="submit" disabled={pending}>
                Invite User
              </Button>
            </div>
            {message ? <div className="p-2">{message}</div> : undefined}
          </form>
        </>
      )}
    </div>
  )
}

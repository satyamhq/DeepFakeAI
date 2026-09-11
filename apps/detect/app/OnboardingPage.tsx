"use client"

import { ReactNode, useState } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button, Card, Checkbox, Label, TextInput } from "flowbite-react"
import { termsUrl, privacyUrl } from "./site"
import { onboardNewUser } from "./internal/users/manage/actions"
import { useUser } from "@clerk/nextjs"
import TrueMediaLogo from "./components/TrueMediaLogo"

/** This only works with Clerk */
export default function OnboardingPage() {
  const { isLoaded, user } = useUser()
  const router = useRouter()
  const { pending } = useFormStatus()
  const [message, setMessage] = useState("")
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [emailConsent, setEmailConsent] = useState(false)

  async function onSubmit(data: FormData) {
    const org = ((data.get("org") as string) ?? "").trim()
    const agreedTerms = ((data.get("accept") as string) ?? "").trim() == "on"
    const emailConsent = ((data.get("emailConsent") as string) ?? "").trim() == "on"
    const rsp = await onboardNewUser({ org, agreedTerms, emailConsent })
    switch (rsp.type) {
      case "error":
        setMessage(rsp.message)
        break
      case "updated":
        await user?.reload()
        router.refresh()
        break
    }
  }

  if (!isLoaded) return null

  return (
    <main className="flex flex-col grow justify-center items-center">
      <div className="">
        <TrueMediaLogo />
        <div className="text-lg pt-2">Non-profit, non-partisan, free.</div>
      </div>
      <Card className="m-5 md:mx-auto md:w-96">
        <form action={onSubmit} className="flex flex-col gap-4">
          <Label htmlFor="email">Your Email</Label>
          <div id="email" className="text-lime-500">
            {user?.primaryEmailAddress?.emailAddress}
          </div>
          <OptionalLabel htmlFor="org">Organization Name</OptionalLabel>
          <TextInput color="green" type="text" id="org" name="org" placeholder={"Organization name"} />
          <div className="flex flex-row gap-4 items-center">
            <Checkbox
              id="accept"
              name="accept"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
            />
            <Label htmlFor="accept" className="text-slate-400">
              By signing up, you agree to TrueMedia.org’s &thinsp;
              <Link className="text-lime-500" href={termsUrl}>
                Terms of Services
              </Link>
              &thinsp; and &nbsp;
              <Link className="text-lime-500" href={privacyUrl}>
                Privacy Policy
              </Link>
              .
            </Label>
          </div>
          <div className="flex flex-row gap-4 items-center">
            <Checkbox
              id="emailConsent"
              name="emailConsent"
              checked={emailConsent}
              onChange={(e) => setEmailConsent(e.target.checked)}
            />
            <OptionalLabel htmlFor="emailConsent" className="text-slate-400">
              Email me about product updates and resources.
            </OptionalLabel>
          </div>
          <Button type="submit" disabled={pending || !agreedTerms} color="lime">
            Proceed
          </Button>
          {message ? <div className="p-2">{message}</div> : undefined}
        </form>
      </Card>
    </main>
  )
}

function OptionalLabel({ className, children, htmlFor }: { className?: string; children: ReactNode; htmlFor: string }) {
  return (
    <Label className={`${className} flex flex-row justify-between items-baseline`} htmlFor={htmlFor}>
      {children}
      <div className="text-xs text-slate-400">Optional</div>
    </Label>
  )
}

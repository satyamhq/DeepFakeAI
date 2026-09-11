"use client"

import { SignIn } from "@clerk/nextjs"

export default function ClerkLoginPage() {
  return (
    <main className="grow flex justify-center items-center">
      <SignIn />
    </main>
  )
}

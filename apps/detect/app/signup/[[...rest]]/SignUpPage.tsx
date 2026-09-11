"use client"

import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <main className="grow flex justify-center items-center">
      <SignUp />
    </main>
  )
}

"use client"

import AuthForm from "../../components/auth/AuthForm"

export default function ClerkLoginPage() {
  return (
    <main className="grow flex justify-center items-center px-4 py-16">
      <AuthForm initialMode="signin" />
    </main>
  )
}


"use client"

import AuthForm from "../../components/auth/AuthForm"

export default function SignUpPage() {
  return (
    <main className="grow flex justify-center items-center px-4 py-16">
      <AuthForm initialMode="signup" />
    </main>
  )
}


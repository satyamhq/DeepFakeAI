"use client"

import { SignIn } from "@clerk/nextjs"
import Link from "next/link"

const isMockClerkKey =
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("ZXhhbXBsZS") ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("your_clerk")

export default function ClerkLoginPage() {
  if (isMockClerkKey) {
    return (
      <main className="grow flex justify-center items-center px-4">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-12 h-12 bg-lime-500/10 text-lime-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            ℹ️
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Local Development Mode</h2>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Authentication requires valid Clerk API keys. To enable real sign-in, add your keys to{" "}
            <code className="bg-gray-900 px-2 py-1 rounded text-lime-400 text-xs">.env</code>.
          </p>
          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full bg-lime-500 hover:bg-lime-600 text-slate-900 font-semibold py-2.5 px-4 rounded-lg transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="grow flex justify-center items-center">
      <SignIn />
    </main>
  )
}

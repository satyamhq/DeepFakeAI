"use client"

import React, { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import DeepFakeAILogo from "../DeepFakeAILogo"
import { getSupabaseBrowserClient } from "../../supabase"
import { RiLockPasswordLine, RiMailLine, RiEyeLine, RiEyeOffLine, RiLoader4Line } from "react-icons/ri"

interface AuthFormProps {
  initialMode?: "signin" | "signup"
}

export default function AuthForm({ initialMode = "signin" }: AuthFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect_to") || "/"

  const [mode, setMode] = useState<"signin" | "signup">(initialMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!email || !password) {
      setError("Please fill in both email and password.")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.")
      return
    }

    setLoading(true)

    try {
      const supabase = getSupabaseBrowserClient()

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split("@")[0],
            },
          },
        })

        if (signUpError) {
          setError(signUpError.message)
          setLoading(false)
          return
        }

        if (data.session) {
          router.push(redirectTo)
          router.refresh()
        } else {
          setSuccessMessage("Account created successfully! You can now sign in.")
          setMode("signin")
          setLoading(false)
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          setError(signInError.message)
          setLoading(false)
          return
        }

        if (data.session) {
          router.push(redirectTo)
          router.refresh()
        } else {
          router.push("/")
        }
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during authentication.")
      setLoading(false)
    }
  }

  const fillDemoAccount = () => {
    setEmail("demo@deepfakeai.org")
    setPassword("DemoSecure123!")
    setError(null)
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-gray-800/95 backdrop-blur border border-gray-700/80 rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <DeepFakeAILogo size="lg" />
          <h1 className="text-2xl font-bold text-white mt-4 tracking-tight">
            {mode === "signin" ? "Welcome Back" : "Create an Account"}
          </h1>
          <p className="text-sm text-gray-400 mt-1 text-center">
            {mode === "signin"
              ? "Sign in to access deepfake detection & media analysis"
              : "Register to analyze media, track results, and protect authenticity"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-gray-900/60 rounded-xl mb-6 border border-gray-700/50">
          <button
            type="button"
            onClick={() => {
              setMode("signin")
              setError(null)
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              mode === "signin"
                ? "bg-lime-500 text-gray-950 shadow"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup")
              setError(null)
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              mode === "signup"
                ? "bg-lime-500 text-gray-950 shadow"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-800/80 text-red-200 text-xs leading-relaxed">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-lime-950/50 border border-lime-800/80 text-lime-300 text-xs leading-relaxed">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <RiMailLine className="w-5 h-5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 text-sm transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <RiLockPasswordLine className="w-5 h-5" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 text-sm transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <RiEyeOffLine className="w-5 h-5" /> : <RiEyeLine className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-lime-500 hover:bg-lime-400 text-gray-950 font-bold text-sm shadow transition duration-150 flex items-center justify-center disabled:opacity-50"
          >
            {loading ? (
              <>
                <RiLoader4Line className="animate-spin w-5 h-5 mr-2" />
                {mode === "signin" ? "Signing In..." : "Creating Account..."}
              </>
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Create Free Account"
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-700/60 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={fillDemoAccount}
            className="text-xs text-lime-400 hover:text-lime-300 underline font-medium transition"
          >
            Quick Fill Demo Account
          </button>

          <p className="text-xs text-gray-500 text-center">
            Protected by DeepFakeAI Supabase Auth. By continuing, you agree to our{" "}
            <Link href="/terms" className="text-gray-400 hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-gray-400 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

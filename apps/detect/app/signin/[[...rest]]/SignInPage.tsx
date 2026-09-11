"use client"

import Link from "next/link"
import DeepFakeAILogo from "../../components/DeepFakeAILogo"

export default function ClerkLoginPage() {
  return (
    <main className="grow flex justify-center items-center px-4 py-16">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
        <div className="mb-4 flex justify-center">
          <DeepFakeAILogo size="lg" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Open Access Platform</h2>
        <p className="text-gray-300 text-sm mb-6 leading-relaxed">
          DeepFakeAI is completely open and free. No login or signup is required to analyze media, check deepfakes, and explore detection models.
        </p>
        <Link
          href="/"
          className="inline-block w-full bg-lime-500 hover:bg-lime-400 text-gray-950 font-bold py-3 px-4 rounded-xl transition"
        >
          Start Deepfake Detection
        </Link>
      </div>
    </main>
  )
}

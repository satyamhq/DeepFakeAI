import Navigation from "../components/navigation/Navigation"
import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "About - DeepFakeAI",
  description: "About DeepFakeAI - Free, non-partisan, public deepfake detection service.",
}

export default function AboutPage() {
  return (
    <Navigation>
      <main className="grow mx-auto px-6 py-10 max-w-4xl text-gray-200">
        <div className="border-b border-gray-700 pb-6 mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">About DeepFakeAI</h1>
          <p className="text-sm text-gray-400 mt-2">
            Democratizing deepfake detection technology for the public good.
          </p>
        </div>

        <div className="space-y-8 leading-relaxed">
          <section className="bg-gray-800/60 border border-gray-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-lime-400 mb-3">Our Mission</h2>
            <p className="text-gray-300 text-lg">
              DeepFakeAI is a non-profit, non-partisan initiative built to identify AI-generated and manipulated media across social platforms. In an era of rampant synthetic media, we empower citizens, journalists, and researchers with state-of-the-art forensic detection tools without paywalls or forced registration.
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-5">
              <h3 className="font-bold text-white mb-2 text-lg">Multi-Model Ensemble</h3>
              <p className="text-gray-400 text-sm">
                Combining specialized facial feature analysis, audio frequency spectrum forensics, and synthetic pattern detection to achieve over 90% accuracy.
              </p>
            </div>
            <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-5">
              <h3 className="font-bold text-white mb-2 text-lg">Self-Contained &amp; Open</h3>
              <p className="text-gray-400 text-sm">
                No external redirects, no forced sign-in walls. Analyze URLs or upload media directly from your browser.
              </p>
            </div>
            <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-5">
              <h3 className="font-bold text-white mb-2 text-lg">Supabase Powered</h3>
              <p className="text-gray-400 text-sm">
                Backed by real-time, secure database infrastructure providing fast query resolution and caching.
              </p>
            </div>
          </section>

          <section className="border-t border-gray-700 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Ready to test a video, audio, or image?</h3>
              <p className="text-sm text-gray-400">Jump directly into our detection dashboard.</p>
            </div>
            <Link
              href="/"
              className="bg-lime-500 hover:bg-lime-600 text-slate-900 font-bold py-2.5 px-6 rounded-lg transition"
            >
              Verify Authenticity
            </Link>
          </section>
        </div>
      </main>
    </Navigation>
  )
}

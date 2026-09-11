"use client"

import Navigation from "../components/navigation/Navigation"
import { useState, FormEvent } from "react"

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", subject: "general", message: "" })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <Navigation>
      <main className="grow mx-auto px-6 py-10 max-w-4xl text-gray-200">
        <div className="border-b border-gray-700 pb-6 mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Help &amp; Contact</h1>
          <p className="text-sm text-gray-400 mt-2">
            Get assistance with deepfake analysis, reporting issues, or general questions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Form */}
          <div className="bg-gray-800/80 border border-gray-700 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4">Send us a message</h2>
            {submitted ? (
              <div className="bg-lime-900/40 border border-lime-500/50 rounded-xl p-6 text-center">
                <div className="text-3xl mb-2">✅</div>
                <h3 className="text-lg font-bold text-white mb-1">Message Received</h3>
                <p className="text-gray-300 text-sm">
                  Thank you for contacting DeepFakeAI. Our support team will review your inquiry.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 text-xs text-lime-400 hover:underline font-semibold"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter your name"
                    className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Inquiry Topic</label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-white focus:outline-none focus:border-lime-500"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="false_positive">Report False Positive / Negative</option>
                    <option value="partnership">API / Academic Research</option>
                    <option value="bug">Technical Issue / Bug</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Describe how we can help..."
                    className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-lime-500 hover:bg-lime-600 text-slate-900 font-bold py-2.5 px-4 rounded-lg transition"
                >
                  Submit Inquiry
                </button>
              </form>
            )}
          </div>

          {/* Quick Support & FAQ */}
          <div className="space-y-6">
            <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-lime-400 mb-3">Frequently Asked Questions</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-white">How does detection work?</h4>
                  <p className="text-gray-400 mt-1">
                    DeepFakeAI runs an ensemble of specialized neural models detecting facial warping, audio frequency anomalies, and generative artifacts.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-white">Is login required to check media?</h4>
                  <p className="text-gray-400 mt-1">
                    No. DeepFakeAI is open and self-contained — you can paste social media links or upload files directly on the home page without logging in.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-white">Which platforms are supported?</h4>
                  <p className="text-gray-400 mt-1">
                    Direct resolution supports posts from X (Twitter), TikTok, Instagram, Reddit, Facebook, and direct media file uploads.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">Platform Status</h3>
              <p className="text-sm text-gray-400">
                All Supabase analytical services and core verification pipelines are currently <span className="text-lime-400 font-medium">Operational</span>.
              </p>
            </div>
          </div>
        </div>
      </main>
    </Navigation>
  )
}

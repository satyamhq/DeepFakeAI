"use client"

import React from "react"
import { HiOutlineSparkles } from "react-icons/hi2"
import { FaShieldHalved } from "react-icons/fa6"
import { RiScan2Line } from "react-icons/ri"

export type AnalyzingAnimationProps = {
  elapsedSeconds: number
  maxSeconds?: number
  mediaType?: string
}

const STAGES = [
  { start: 0, end: 12, label: "Ingesting media stream & parsing metadata headers..." },
  { start: 13, end: 24, label: "Scanning neural generative artifacts & deepfake textures..." },
  { start: 25, end: 38, label: "Cross-referencing spatial frequency & biological consistency models..." },
  { start: 39, end: 50, label: "Ensembling multi-provider detection consensus..." },
  { start: 51, end: 55, label: "Finalizing authoritative forensic result..." },
]

export default function AnalyzingAnimation({
  elapsedSeconds,
  maxSeconds = 55,
  mediaType = "media",
}: AnalyzingAnimationProps) {
  const currentElapsed = Math.min(maxSeconds, Math.max(0, elapsedSeconds))
  const progressPercent = Math.min(100, Math.round((currentElapsed / maxSeconds) * 100))
  const remainingSeconds = Math.max(0, maxSeconds - currentElapsed)

  // Current stage message
  const currentStage =
    STAGES.find((s) => currentElapsed >= s.start && currentElapsed <= s.end) || STAGES[STAGES.length - 1]

  return (
    <div className="w-full my-4 rounded-2xl border border-lime-500/30 bg-gradient-to-br from-gray-900 via-gray-850 to-gray-900 p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur">
      {/* Background Animated Gradient Glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-lime-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Radar Scanner Animation Icon */}
        <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
          {/* Outer Pulsing Rings */}
          <div className="absolute inset-0 rounded-full border border-lime-500/30 animate-ping opacity-30" />
          <div className="absolute -inset-2 rounded-full border border-lime-400/20 animate-pulse" />
          <div className="absolute inset-2 rounded-full border-2 border-dashed border-lime-500/50 animate-spin" style={{ animationDuration: "12s" }} />

          {/* Central Radar Glow */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-lime-500/20 to-emerald-500/30 border border-lime-400/60 flex items-center justify-center shadow-lg shadow-lime-500/20">
            <RiScan2Line className="w-8 h-8 text-lime-400 animate-pulse" />
          </div>
        </div>

        {/* Header and Title */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-500/10 border border-lime-500/30 text-lime-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <HiOutlineSparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "3s" }} />
          <span>Deepfake Neural Analysis In Progress</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
          Analyzing {mediaType.toLowerCase()}...
        </h2>

        {/* Dynamic Live Status */}
        <p className="text-sm sm:text-base text-gray-300 min-h-[1.5rem] font-medium transition-all duration-300">
          {currentStage.label}
        </p>

        {/* 55-Second Authoritative Timer Display */}
        <div className="mt-6 mb-2 flex items-center justify-center gap-2 text-xs uppercase tracking-widest font-bold">
          <span className="text-lime-400 font-mono text-base">{currentElapsed}s</span>
          <span className="text-gray-500 font-mono">/</span>
          <span className="text-gray-400 font-mono">{maxSeconds}s Max</span>
          <span className="ml-2 text-gray-500">({remainingSeconds}s remaining)</span>
        </div>

        {/* Glowing Progress Bar */}
        <div className="w-full max-w-xl h-3 rounded-full bg-gray-850 border border-gray-700/80 p-0.5 overflow-hidden my-3 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-lime-500 via-emerald-400 to-lime-300 transition-all duration-1000 ease-out shadow-sm shadow-lime-400/50"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Micro-Features Checklist */}
        <div className="w-full max-w-xl grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-xs">
          <div className={`p-2 rounded-lg border text-center transition ${currentElapsed >= 0 ? "border-lime-500/40 bg-lime-950/20 text-lime-300" : "border-gray-800 text-gray-500"}`}>
            Optical Flow
          </div>
          <div className={`p-2 rounded-lg border text-center transition ${currentElapsed >= 13 ? "border-lime-500/40 bg-lime-950/20 text-lime-300" : "border-gray-800 text-gray-500"}`}>
            Neural Artifacts
          </div>
          <div className={`p-2 rounded-lg border text-center transition ${currentElapsed >= 25 ? "border-lime-500/40 bg-lime-950/20 text-lime-300" : "border-gray-800 text-gray-500"}`}>
            Acoustic / Visual
          </div>
          <div className={`p-2 rounded-lg border text-center transition ${currentElapsed >= 39 ? "border-lime-500/40 bg-lime-950/20 text-lime-300" : "border-gray-800 text-gray-500"}`}>
            Multi-Model Consensus
          </div>
        </div>

        {/* Guarantee Callout */}
        <div className="mt-6 flex items-center gap-2 text-xs text-gray-400 bg-gray-800/60 px-4 py-2 rounded-xl border border-gray-700/50">
          <FaShieldHalved className="w-4 h-4 text-lime-400 shrink-0" />
          <span>
            Strict 55s Maximum: Real API results appear instantly when ready; synthetic test result generated at exactly 55s if providers are delayed.
          </span>
        </div>
      </div>
    </div>
  )
}

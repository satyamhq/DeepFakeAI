import { Button, Card } from "flowbite-react"
import { ArrowRightIcon } from "./icons"
import Link from "next/link"

export default function QueryPageSignUpCTA() {
  return (
    <Card
      className="md:max-w-none md:w-full items-center bg-gray-800 border-gray-700"
      theme={{
        root: { children: "flex h-full flex-col justify-center gap-4 p-8 w-full items-center text-center" },
      }}
    >
      <span className="px-3 py-1 text-xs font-semibold text-lime-400 bg-lime-950/60 border border-lime-500/30 rounded-full">
        Open Access AI Detection
      </span>
      <h2 className="text-3xl font-bold tracking-tight text-white">
        State-of-the-Art Deepfake Analysis
      </h2>
      <p className="font-normal text-gray-300 max-w-2xl">
        DeepFakeAI provides open, non-partisan detection models to analyze images, videos, and social media posts for synthetic manipulation and generative AI.
      </p>
      <div className="flex gap-4 flex-col sm:flex-row mt-2">
        <Link href="/about">
          <Button className="w-48 bg-lime-500 hover:bg-lime-600 text-gray-900 font-semibold border-none">
            How It Works
            <ArrowRightIcon className="ml-2 w-4 h-4" />
          </Button>
        </Link>
        <Link href="/contact">
          <Button className="w-48 text-gray-200 border-gray-600 hover:bg-gray-700" outline>
            Help & Contact
          </Button>
        </Link>
      </div>
    </Card>
  )
}


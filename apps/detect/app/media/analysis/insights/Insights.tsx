"use client"

import { Badge } from "flowbite-react"
import { BiMessageDetail } from "react-icons/bi"
import { JoinedMedia } from "../../../data/media"
import { CachedResults, ModelResult } from "../../../data/model"
import { HumanAnalysis } from "./HumanAnalysis"
import { AIRationaleSection } from "./AIRationale"
import { Fragment } from "react"

export default function Insights({
  media,
  cached,
  ready,
  pending,
}: {
  media: JoinedMedia
  cached: CachedResults
  ready: ModelResult[]
  pending: string[]
}) {
  const cards = [HumanAnalysis({ media }), AIRationaleSection({ media, cached, ready, pending })].filter(
    (card) => card !== null,
  )

  if (cards.length === 0) return null

  return (
    <div>
      <div className="text-left mt-5 mb-5">
        <div className="flex flex-row gap-2 text-3xl items-center">
          <BiMessageDetail />
          <span>Insights</span>
          <Badge color="gray" size="sm">
            {cards.length}
          </Badge>
        </div>
        <div className="ml-10">Explanations for the verdict</div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {cards.map((card, index) => (
          <Fragment key={index}>{card}</Fragment>
        ))}
      </div>
    </div>
  )
}

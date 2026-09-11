"use client"

import { Button, Select, TextInput, Checkbox, Label } from "flowbite-react"
import { useState } from "react"
import PickDateRange from "../components/PickDateRange"
import { DateRange, YMD } from "../summarize"

export default function SearchForm({
  q,
  type,
  truth,
  audiotruth,
  fb,
  reviewer,
  reviewers,
  from,
  to,
}: {
  q: string
  type: string
  truth: string
  audiotruth: string
  fb: string
  reviewer: string
  reviewers: string[]
  from?: YMD
  to?: YMD
}) {
  const [query, setQuery] = useState(q)
  const dateRange: DateRange = { from, to }
  const mkOption = (v: string, l: string) => <option value={v}>{l}</option>
  return (
    <form action={"/internal/media"}>
      <div className="flex flex-row items-end gap-4">
        <div>
          Search
          <TextInput
            className="text-black"
            placeholder="search"
            name="q"
            value={query}
            onChange={(ev) => setQuery(ev.target.value)}
          />
        </div>
        <div>
          Media Type
          <Select name="type" defaultValue={type}>
            {mkOption("any", "Any")}
            {mkOption("image", "Image")}
            {mkOption("video", "Video")}
            {mkOption("audio", "Audio")}
          </Select>
        </div>
        <div>
          Ground Truth
          <Select name="truth" defaultValue={truth}>
            {mkOption("any", "Any")}
            {mkOption("fake", "Fake")}
            {mkOption("real", "Real")}
            {mkOption("unknown", "Unknown")}
          </Select>
        </div>
        <div>
          Audio Truth
          <Select name="audiotruth" defaultValue={audiotruth}>
            {mkOption("any", "Any")}
            {mkOption("fake", "Fake")}
            {mkOption("real", "Real")}
            {mkOption("unknown", "Unknown")}
          </Select>
        </div>
        <div>
          <PickDateRange titleColor="text-white" range={dateRange} setRange={() => {}} />
        </div>
        <div>
          Reviewed By
          <Select name="reviewer" defaultValue={reviewer}>
            {mkOption("any", "Any")}
            {mkOption("unreviewed", "Unreviewed")}
            {reviewers.sort().map((reviewer: string) => mkOption(reviewer, reviewer))}
          </Select>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Checkbox id="withFeedback" name="fb" defaultChecked={fb === "on"} />
          <Label htmlFor="withFeedback">With feedback</Label>
        </div>
        <Button color="lime" type="submit">
          Search
        </Button>
      </div>
    </form>
  )
}

/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"

import { ResultsCard } from "./ModelCards"
import { ModelResult } from "../../data/model"

test("<ResultsCard> displays score for models that do not omit display", async () => {
  const result: ModelResult = {
    modelId: "hive-image-genai-v2",
    score: 0.5,
    rank: "uncertain",
  }
  render(<ResultsCard result={result} />)
  expect(screen.queryByText("confidence", { exact: false })).toBeInTheDocument()
})

test("<ResultsCard> hides confidence on models that omit display", async () => {
  const result: ModelResult = {
    modelId: "transcript",
    score: 0.5,
    rank: "uncertain",
  }
  render(<ResultsCard result={result} />)
  expect(screen.queryByText("confidence", { exact: false })).toBeNull()
})

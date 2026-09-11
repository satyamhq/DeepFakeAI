import { ImageGenerators, getGeneratorPrediction } from "./aion"

it("getGeneratorPrediction() should return the most probable generator", () => {
  const imageGenerators: ImageGenerators = {
    midjourney: { confidence: 0.007105079560918129, is_detected: true },
    dall_e: { confidence: 0.5, is_detected: true },
    stable_diffusion: { confidence: 0, is_detected: false },
    this_person_does_not_exist: { confidence: 0, is_detected: false },
    adobe_firefly: { confidence: 0, is_detected: false },
  }
  const prediction = getGeneratorPrediction(imageGenerators)
  expect(prediction?.generator).toBe("dalle")
  expect(prediction?.score).toBe(0.5)
})

it("getGeneratorPrediction() should return undefined if no is_detected true", () => {
  const imageGenerators: ImageGenerators = {
    midjourney: { confidence: 0.007105079560918129, is_detected: false },
    dall_e: { confidence: 0, is_detected: false },
    stable_diffusion: { confidence: 0, is_detected: false },
    this_person_does_not_exist: { confidence: 0, is_detected: false },
    adobe_firefly: { confidence: 0, is_detected: false },
  }
  const prediction = getGeneratorPrediction(imageGenerators)
  expect(prediction).toBe(undefined)
})

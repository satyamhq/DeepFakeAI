import { getGeneratorPrediction, Response } from "./hive"

it("getGeneratorPrediction() should return the most probable generator", () => {
  const response: Response = {
    // @ts-expect-error not using input
    input: null,
    output: [
      {
        time: 0,
        bounding_poly: [],
        classes: [
          { class: "not_ai_generated", score: 0.9886418073366 },
          { class: "ai_generated", score: 0.011358192663399927 },
          { class: "none", score: 0.99218753045431 },
          { class: "dalle", score: 0.0003403793994588847 },
          { class: "midjourney", score: 0.571050795609181 },
          { class: "stablediffusion", score: 0.0002928589730421363 },
          { class: "hive", score: 0.00001815957505137178 },
          { class: "bingimagecreator", score: 3.660511081152526e-7 },
          { class: "gan", score: 0.000004029679834175357 },
          { class: "adobefirefly", score: 0.0000016865824798386598 },
          { class: "kandinsky", score: 0.000022295982663252963 },
          { class: "stablediffusionxl", score: 0.000027613741134212657 },
        ],
      },
    ],
  }
  const prediction = getGeneratorPrediction(response)
  expect(prediction?.generator).toBe("midjourney")
  expect(prediction?.score).toBe(0.571050795609181)
})

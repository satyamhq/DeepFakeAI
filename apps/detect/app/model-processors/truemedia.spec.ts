import { processors } from "./truemedia"

const { genconvit } = processors

it("genconvit.adapt() should extract the high model results from the raw response", () => {
  const rawResponse = {
    df_probability: 0.9,
  }
  const modelResults = genconvit.adapt(rawResponse)

  expect(modelResults).toHaveLength(2)
  const modelResult = modelResults[1]
  expect(modelResult).toStrictEqual({ modelId: "genconvit", rank: "high", score: 0.9 })
})

it("genconvit.adapt() should extract the low model results from the raw response", () => {
  const rawResponse = {
    df_probability: 0.1,
  }
  const modelResults = genconvit.adapt(rawResponse)

  expect(modelResults).toHaveLength(2)
  const modelResult = modelResults[1]
  expect(modelResult).toStrictEqual({ modelId: "genconvit", rank: "low", score: 0.1 })
})

it("genconvit.adapt() with no face result should create an n/a response", () => {
  const rawResponse = {
    prediction: "NO_FACE",
  }
  const modelResults = genconvit.adapt(rawResponse)

  expect(modelResults).toHaveLength(2)
  const modelResult = modelResults[1]
  expect(modelResult).toStrictEqual({ modelId: "genconvit", rank: "n/a", score: 0 })
})

it("genconvit.adapt() with no face result should create an n/a response", () => {
  const rawResponse = {
    prediction: "NO_FACE",
  }
  const modelResults = genconvit.adapt(rawResponse)

  expect(modelResults).toHaveLength(2)
  expect(modelResults).toContainEqual({ modelId: "genconvit", rank: "n/a", score: 0 })
  expect(modelResults).toContainEqual({ modelId: "genconvit-faces", rank: "n/a", score: 0, faces: [] })
})

import { isArchived } from "../../../model-processors/all"
import { sortScoresColumnHeaders } from "./util"
import { empty, short, medium, long } from "./util.data"

describe("Sorting score column labels", () => {
  it("Sorts empty scores", () => {
    expect(sortScoresColumnHeaders(empty).length).toBe(0)
  })

  it("Sorts short scores", () => {
    expect(sortScoresColumnHeaders(short)).toEqual(
      ["dire", "reverse-search", "ufd"].filter((modelId) => !isArchived(modelId)),
    )
  })

  it("Sorts medium scores", () => {
    expect(sortScoresColumnHeaders(medium)).toEqual(
      [
        "aion-image",
        "dire",
        "faces",
        "hive-image-genai-v2",
        "openai-artwork",
        "openai-text",
        "rd-cedar-img",
        "rd-elm-img",
        "rd-img-ensemble",
        "rd-oak-img",
        "rd-pine-img",
        "reverse-search",
        "sensity-image",
        "ufd",
      ].filter((modelId) => !isArchived(modelId)),
    )
  })

  it("Sorts long scores", () => {
    expect(sortScoresColumnHeaders(long)).toEqual(
      [
        "aion-image",
        "dire",
        "faces",
        "hive-image-genai-v2",
        "openai-artwork",
        "openai-text",
        "rd-cedar-img",
        "rd-elm-img",
        "rd-img-ensemble",
        "rd-oak-img",
        "rd-pine-img",
        "reverse-search",
        "sensity-image",
        "ufd",
      ].filter((modelId) => !isArchived(modelId)),
    )
  })
})

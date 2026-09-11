import { getExperimentalDescription } from "./VerdictDescription"

test("getExperimentalDescription()", () => {
  // Test the case where there are no experimental reasons
  expect(getExperimentalDescription([])).toBe("")
  // Test the case where there is one experimental reason
  expect(getExperimentalDescription(["faces-too-many"])).toBe("it contains too many faces")
  // Test the case where there are two experimental reasons
  expect(getExperimentalDescription(["faces-too-many", "artwork"])).toBe(
    "it contains too many faces and it contains artwork",
  )
  // Test the case where there are more than two experimental reasons
  expect(getExperimentalDescription(["faces-too-many", "artwork", "faces-too-few"])).toBe(
    "it contains artwork, it contains too many faces, and our computer vision models didn't identify any faces (possibly due to framing or resolution)",
  )
})

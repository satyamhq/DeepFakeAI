import { CachedResults, UNKNOWN_FACE, cachedResultsEqual } from "./model"
import { resolveResults, computeVerdict, computeVoteVerdict } from "./verdict"

it("parseEmptyResults()", () => {
  const cached: CachedResults = {}
  const results = resolveResults("image", cached)
  expect(results).toHaveLength(0)
})

it("resolveResults() and check rank", () => {
  const cached: CachedResults = {
    ufd: { rank: "high", score: 0.9796350598335266 },
    "hive-image-genai-v2": { rank: "n/a", score: 0.0003721829882842558 },
    "rd-elm-img": { rank: "n/a", score: 0.005853957962244749 },
    "rd-oak-img": { rank: "uncertain", score: 0.4977182745933533 },
    "rd-pine-img": { rank: "low", score: 0.1655619889497757 },
    "rd-cedar-img": { rank: "n/a", score: 0.0003401271824259311 },
    "sensity-image": { rank: "n/a", score: 0 },
  }
  const results = resolveResults("image", cached, false)
  expect(results).toHaveLength(7)
  const { showResults, verdict, voteVerdict } = computeVerdict("image", "UNKNOWN", false, results, [])
  expect(showResults).toBe(true)
  expect(verdict).toBe("uncertain")
  expect(voteVerdict).toBe("uncertain")
})

it("cachedEqual() checks deeply and tolerates tiny rounding errors", () => {
  const cached1: CachedResults = {
    ufd: { rank: "high", score: 0.9796350598335266 },
    "hive-image-genai-v2": { rank: "n/a", score: 0.0003721829882842558 },
    "rd-elm-img": { rank: "n/a", score: 0.005853957962244749 },
    "rd-oak-img": { rank: "uncertain", score: 0.4977182745933533 },
    "rd-pine-img": { rank: "low", score: 0.1655619889497757 },
    "rd-cedar-img": { rank: "n/a", score: 0.0003401271824259311 },
    "sensity-image": { rank: "n/a", score: 0 },
  }
  expect(cachedResultsEqual(cached1, cached1)).toBe(true)

  // ensure that a tiny difference in score does not change equality
  const cached2: CachedResults = {
    ...cached1,
    "hive-image-genai-v2": { rank: "n/a", score: 0.0003721829882842559 },
  }
  expect(cachedResultsEqual(cached1, cached2)).toBe(true)

  // ensure that a larger difference in score does change equality
  const cached3: CachedResults = {
    ...cached1,
    "hive-image-genai-v2": { rank: "n/a", score: 0.0003721829 },
  }
  expect(cachedResultsEqual(cached1, cached3)).toBe(false)

  // ensure that ensure that a difference in some deep object does change equality
  const cached4a: CachedResults = {
    ...cached1,
    "hive-image-genai-v2": {
      rank: "n/a",
      score: 0.0003721829,
      frames: [
        { time: 0, faces: [{ bounds: [0, 0, 4, 4], score: 0.5 }] },
        { time: 1, faces: [{ bounds: [0, 0, 4, 4], score: 0.35 }] },
      ],
    },
  }
  const cached4b: CachedResults = {
    ...cached1,
    "hive-image-genai-v2": {
      rank: "n/a",
      score: 0.0003721829,
      frames: [
        { time: 0, faces: [{ bounds: [0, 0, 4, 4], score: 0.75 }] },
        { time: 1, faces: [{ bounds: [0, 0, 4, 4], score: 0.35 }] },
      ],
    },
  }
  expect(cachedResultsEqual(cached4a, cached4b)).toBe(false)
})

it("resolveResults() with ModelResults", () => {
  const cached: CachedResults = {
    ufd: {
      rank: "low",
      score: 0.01485975459218025,
    },
  }
  const results = resolveResults("image", cached)
  expect(results).toHaveLength(1)
})

it("visual noise verdict special case", () => {
  // courtesy of yXIZuqA3yRONZHxpTCcGDDIYB0U.webp
  // this one has only visual noise models returning fake
  expect(
    computeVoteVerdict(
      "image",
      resolveResults("image", {
        ufd: { rank: "high", score: 0.9009035229682922 },
        "aion-image": { rank: "low", score: 0.01457297801971436 },
        "rd-elm-img": { rank: "low", score: 0.01554817426949739 },
        "rd-oak-img": { rank: "low", score: 0.01 },
        "rd-pine-img": { rank: "high", score: 0.8091042637825012 },
        "rd-cedar-img": { rank: "low", score: 0.01 },
        "sensity-image": { rank: "low", score: 0 },
        "rd-img-ensemble": { rank: "low", score: 0.2438834598274513 },
      }),
    ),
  ).toBe("uncertain")
})

it("computeVerdict() with trusted media", () => {
  // copied from an above test that should return a "uncertain" rank
  const cached: CachedResults = {
    ufd: { rank: "high", score: 0.9796350598335266 },
    "hive-image-genai-v2": { rank: "n/a", score: 0.0003721829882842558 },
    "rd-elm-img": { rank: "n/a", score: 0.005853957962244749 },
    "rd-oak-img": { rank: "uncertain", score: 0.4977182745933533 },
    "rd-pine-img": { rank: "low", score: 0.1655619889497757 },
    "rd-cedar-img": { rank: "n/a", score: 0.0003401271824259311 },
    "sensity-image": { rank: "n/a", score: 0 },
  }
  const results = resolveResults("image", cached)
  let { verdict } = computeVerdict("image", "UNKNOWN", false, results, [])
  expect(verdict).toBe("uncertain")
  verdict = computeVerdict("image", "UNKNOWN", true, results, []).verdict
  expect(verdict).toBe("trusted")
})

it("computeVerdict() calls trusted media that is marked fake as fake", () => {
  // copied from an above test that should return a "uncertain" rank
  const cached: CachedResults = {
    ufd: { rank: "low", score: 0.01485975459218025 },
    "aion-image": { rank: "high", score: 0.9796350598335266 },
    "hive-image-genai-v2": { rank: "n/a", score: 0.0003721829882842558 },
    "rd-elm-img": { rank: "n/a", score: 0.005853957962244749 },
    "rd-oak-img": { rank: "uncertain", score: 0.4977182745933533 },
    "rd-pine-img": { rank: "low", score: 0.1655619889497757 },
    "rd-cedar-img": { rank: "n/a", score: 0.0003401271824259311 },
    "sensity-image": { rank: "n/a", score: 0 },
  }
  const results = resolveResults("image", cached)
  const { verdict } = computeVerdict("image", "TRUE", true, results, [])
  expect(verdict).toBe("high")
})

it("computeVerdict() calls trusted media that is marked real as trusted, even with experimental face result", () => {
  // copied from an above test that should return a "uncertain" rank
  const cached: CachedResults = {
    ufd: { rank: "low", score: 0.01485975459218025 },
    "aion-image": { rank: "high", score: 0.9796350598335266 },
    "hive-image-genai-v2": { rank: "n/a", score: 0.0003721829882842558 },
    "rd-elm-img": { rank: "n/a", score: 0.005853957962244749 },
    "rd-oak-img": { rank: "uncertain", score: 0.4977182745933533 },
    "rd-pine-img": { rank: "low", score: 0.1655619889497757 },
    "rd-cedar-img": { rank: "n/a", score: 0.0003401271824259311 },
    "sensity-image": { rank: "n/a", score: 0 },
    faces: { rank: "n/a", score: 0, faces: [] },
  }
  const results = resolveResults("image", cached)
  const { verdict } = computeVerdict("image", "FALSE", true, results, [])
  expect(verdict).toBe("trusted")
})

it("computeVerdict() is uncertain when there are faces detected, and no artwork or text", () => {
  const cached: CachedResults = {
    ufd: { rank: "high", score: 0.9796350598335266 },
    faces: { rank: "n/a", score: 0, faces: [UNKNOWN_FACE] },
    "openai-text": { rank: "n/a", score: 0 },
    "openai-artwork": { rank: "n/a", score: 0 },
  }
  const results = resolveResults("image", cached)
  const { verdict, experimentalReasons } = computeVerdict("image", "UNKNOWN", false, results, [])
  expect(verdict).toBe("uncertain")
  expect(experimentalReasons.length).toBe(0)
})

it("computeVerdict() is experimental when there are no faces detected", () => {
  const cached: CachedResults = {
    ufd: { rank: "high", score: 0.9796350598335266 },
    faces: { rank: "n/a", score: 0, faces: [] },
    "openai-text": { rank: "n/a", score: 0 },
    "openai-artwork": { rank: "n/a", score: 0 },
  }
  const results = resolveResults("image", cached)
  const { verdict, experimentalReasons } = computeVerdict("image", "UNKNOWN", false, results, [])
  expect(verdict).toBe("uncertain")
  expect(experimentalReasons.length).toBe(1)
})

it("computeVerdict() is experimental when there is artwork detected", () => {
  const cached: CachedResults = {
    ufd: { rank: "high", score: 0.9796350598335266 },
    faces: { rank: "n/a", score: 0, faces: [UNKNOWN_FACE] },
    "openai-text": { rank: "n/a", score: 0 },
    "openai-artwork": { rank: "n/a", score: 1 },
  }
  const results = resolveResults("image", cached)
  const { verdict, experimentalReasons } = computeVerdict("image", "UNKNOWN", false, results, [])
  expect(verdict).toBe("uncertain")
  expect(experimentalReasons.length).toBe(1)
})

it("computeVerdict() is experimental when there is text detected", () => {
  const cached: CachedResults = {
    ufd: { rank: "high", score: 0.9796350598335266 },
    faces: { rank: "n/a", score: 0, faces: [UNKNOWN_FACE] },
    "openai-text": { rank: "n/a", score: 1 },
    "openai-artwork": { rank: "n/a", score: 0 },
  }
  const results = resolveResults("image", cached)
  const { verdict, experimentalReasons } = computeVerdict("image", "UNKNOWN", false, results, [])
  expect(verdict).toBe("uncertain")
  expect(experimentalReasons.length).toBe(1)
})

it("computeVerdict() is experimental when there are no faces, and text and artwork detected", () => {
  const cached: CachedResults = {
    ufd: { rank: "high", score: 0.9796350598335266 },
    faces: { rank: "n/a", score: 0, faces: [] },
    "openai-text": { rank: "n/a", score: 1 },
    "openai-artwork": { rank: "n/a", score: 1 },
  }
  const results = resolveResults("image", cached)
  const { verdict, experimentalReasons } = computeVerdict("image", "UNKNOWN", false, results, [])
  expect(verdict).toBe("uncertain")
  expect(experimentalReasons.length).toBe(3)
})

it("computeVerdict() is experimental when image finds too many faces", () => {
  const cached: CachedResults = {
    ufd: { rank: "high", score: 0.9796350598335266 },
    faces: { rank: "n/a", score: 0, faces: [UNKNOWN_FACE, UNKNOWN_FACE, UNKNOWN_FACE, UNKNOWN_FACE, UNKNOWN_FACE] },
  }
  const results = resolveResults("image", cached)
  const { verdict, experimentalReasons } = computeVerdict("image", "UNKNOWN", false, results, [])
  expect(verdict).toBe("uncertain")
  expect(experimentalReasons.length).toBe(1)
})

it("computeVerdict() is experimental when majority of face models find no faces", () => {
  const cached: CachedResults = {
    genconvit: { rank: "high", score: 0.9796350598335266 },
    "genconvit-faces": { rank: "n/a", score: 0, faces: [] },
    "hive-video-faces": { rank: "n/a", score: 0, faces: [] },
    "sensity-video-faces": { rank: "n/a", score: 0, faces: [UNKNOWN_FACE] },
  }
  const results = resolveResults("video", cached)
  const { verdict, experimentalReasons } = computeVerdict("video", "UNKNOWN", false, results, [])
  expect(verdict).toBe("uncertain")
  expect(experimentalReasons.length).toBe(1)
})

it("computeVerdict() is not experimental when minority of face models find no faces", () => {
  const cached: CachedResults = {
    genconvit: { rank: "high", score: 0.9796350598335266 },
    "genconvit-faces": { rank: "n/a", score: 0, faces: [] },
    "hive-video-faces": { rank: "n/a", score: 0, faces: [UNKNOWN_FACE] },
    "sensity-video-faces": { rank: "n/a", score: 0, faces: [UNKNOWN_FACE] },
  }
  const results = resolveResults("video", cached)
  const { verdict, experimentalReasons } = computeVerdict("video", "UNKNOWN", false, results, [])
  expect(verdict).toBe("uncertain")
  expect(experimentalReasons.length).toBe(0)
})

it("computeVerdict() is experimental when there's a tie in votes finding no faces", () => {
  const cached: CachedResults = {
    genconvit: { rank: "high", score: 0.9796350598335266 },
    "hive-video-faces": { rank: "n/a", score: 0, faces: [] },
    "sensity-video-faces": { rank: "n/a", score: 0, faces: [UNKNOWN_FACE] },
  }
  const results = resolveResults("video", cached)
  const { verdict, experimentalReasons } = computeVerdict("video", "UNKNOWN", false, results, [])
  expect(verdict).toBe("uncertain")
  expect(experimentalReasons.length).toBe(1)
})

it("computeVerdict() is not experimental when video finds too many faces", () => {
  const cached: CachedResults = {
    genconvit: { rank: "high", score: 0.9796350598335266 },
    "sensity-video-faces": {
      rank: "n/a",
      score: 0,
      faces: [UNKNOWN_FACE, UNKNOWN_FACE, UNKNOWN_FACE, UNKNOWN_FACE, UNKNOWN_FACE],
    },
  }
  const results = resolveResults("video", cached)
  const { verdict, experimentalReasons } = computeVerdict("video", "UNKNOWN", false, results, [])
  expect(verdict).toBe("uncertain")
  expect(experimentalReasons.length).toBe(0)
})

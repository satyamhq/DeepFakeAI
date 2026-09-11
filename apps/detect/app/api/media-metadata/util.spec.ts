import { Trulean } from "@prisma/client"
import { JoinedMedia } from "../../data/media"
import { getSummary } from "./util"
import { verdicts } from "../../data/verdict"

const mediaUnknown = {
  mimeType: "image",
  results: {},
  meta: { fake: Trulean.UNKNOWN, misleading: false },
} as JoinedMedia
const mediaReal = { mimeType: "image", results: {}, meta: { fake: Trulean.FALSE, misleading: false } } as JoinedMedia
const mediaFake = { mimeType: "image", results: {}, meta: { fake: Trulean.TRUE, misleading: false } } as JoinedMedia

const mediaRealMisleading = {
  mimeType: "image",
  results: {},
  meta: { fake: Trulean.FALSE, misleading: true },
} as JoinedMedia
const mediaFakeMisleading = {
  mimeType: "image",
  results: {},
  meta: { fake: Trulean.TRUE, misleading: true },
} as JoinedMedia
const mediaUnknownMisleading = {
  mimeType: "image",
  results: {},
  meta: { fake: Trulean.UNKNOWN, misleading: true },
} as JoinedMedia

describe("Unknown ground truth media summary follows verdict", () => {
  it("Summarizes unknown", () => {
    const summary = getSummary(mediaUnknown)
    expect(summary).toBe(verdicts.unknown.longSummary)
  })

  it("Summarizes low", () => {
    const summary = getSummary(mediaUnknown, "low")
    expect(summary).toBe(verdicts.low.longSummary)
  })

  it("Summarizes uncertain", () => {
    const summary = getSummary(mediaUnknown, "uncertain")
    expect(summary).toBe(verdicts.uncertain.longSummary)
  })

  it("Summarizes high", () => {
    const summary = getSummary(mediaUnknown, "high")
    expect(summary).toBe(verdicts.high.longSummary)
  })

  it("Summarizes trusted", () => {
    const summary = getSummary(mediaUnknown, "trusted")
    expect(summary).toBe(verdicts.trusted.longSummary)
  })
})

describe("Real ground truth always returns low summary", () => {
  it("low", () => {
    const summary = getSummary(mediaReal, "low")
    expect(summary).toBe(verdicts.low.longSummary)
  })

  it("uncertain", () => {
    const summary = getSummary(mediaReal, "uncertain")
    expect(summary).toBe(verdicts.low.longSummary)
  })

  it("high", () => {
    const summary = getSummary(mediaReal, "high")
    expect(summary).toBe(verdicts.low.longSummary)
  })
})

describe("Fake ground truth summary always returns high evidence of manipulation.", () => {
  it("Summarizes unknown", () => {
    const summary = getSummary(mediaFake, "unknown")
    expect(summary).toBe(verdicts.high.longSummary)
  })

  it("Summarizes trusted", () => {
    const summary = getSummary(mediaFake, "trusted")
    expect(summary).toBe(verdicts.high.longSummary)
  })

  it("Summarizes high", () => {
    const summary = getSummary(mediaFake, "low")
    expect(summary).toBe(verdicts.high.longSummary)
  })

  it("Summarizes unknown", () => {
    const summary = getSummary(mediaFake, "uncertain")
    expect(summary).toBe(verdicts.high.longSummary)
  })

  it("Summarizes trusted", () => {
    const summary = getSummary(mediaFake, "high")
    expect(summary).toBe(verdicts.high.longSummary)
  })
})

describe("Misleading media", () => {
  describe("Manipulated misleading media summary always returns high evidence of manipulation.", () => {
    it("Summarizes fake unknown misleading", () => {
      const summary = getSummary(mediaFakeMisleading, "unknown")
      expect(summary).toBe(verdicts.high.misleadingSummary)
    })

    it("Summarizes fake low misleading", () => {
      const summary = getSummary(mediaFakeMisleading, "low")
      expect(summary).toBe(verdicts.high.misleadingSummary)
    })

    it("Summarizes fake uncertain misleading", () => {
      const summary = getSummary(mediaFakeMisleading, "uncertain")
      expect(summary).toBe(verdicts.high.misleadingSummary)
    })
    it("Summarizes fake high misleading", () => {
      const summary = getSummary(mediaFakeMisleading, "high")
      expect(summary).toBe(verdicts.high.misleadingSummary)
    })

    it("Summarizes fake trusted misleading", () => {
      const summary = getSummary(mediaFakeMisleading, "trusted")
      expect(summary).toBe(verdicts.high.misleadingSummary)
    })
  })

  describe("Ground truth unknown media", () => {
    it("Summarizes unknown unknown misleading", () => {
      const summary = getSummary(mediaUnknownMisleading, "unknown")
      expect(summary).toBe(verdicts.unknown.longSummary)
    })

    it("Summarizes unknown low misleading", () => {
      const summary = getSummary(mediaUnknownMisleading, "low")
      expect(summary).toBe(verdicts.unknown.misleadingSummary)
    })

    it("Summarizes unknown uncertain misleading", () => {
      const summary = getSummary(mediaUnknownMisleading, "uncertain")
      expect(summary).toBe(verdicts.uncertain.misleadingSummary)
    })
    it("Summarizes unknown high misleading", () => {
      const summary = getSummary(mediaUnknownMisleading, "high")
      expect(summary).toBe(verdicts.high.misleadingSummary)
    })

    it("Summarizes unknown trusted misleading", () => {
      const summary = getSummary(mediaUnknownMisleading, "trusted")
      expect(summary).toBe(verdicts.unknown.misleadingSummary)
    })
  })

  describe("Un-manipulated misleading media summaries have nuanced descriptions about how they are misleading.", () => {
    it("Summarizes low misleading.", () => {
      const summary = getSummary(mediaRealMisleading, "low")
      expect(summary).toBe(verdicts.low.misleadingSummary)
    })

    it("Summarizes uncertain misleading", () => {
      const summary = getSummary(mediaRealMisleading, "uncertain")
      expect(summary).toBe(verdicts.low.misleadingSummary)
    })

    it("Summarizes high misleading.", () => {
      const summary = getSummary(mediaRealMisleading, "high")
      expect(summary).toBe(verdicts.low.misleadingSummary)
    })

    it("Summarizes unknown misleading.", () => {
      const summary = getSummary(mediaRealMisleading, "unknown")
      expect(summary).toBe(verdicts.low.misleadingSummary)
    })

    it("Summarizes trusted misleading.", () => {
      const summary = getSummary(mediaRealMisleading, "trusted")
      expect(summary).toBe(verdicts.low.misleadingSummary)
    })
  })
})

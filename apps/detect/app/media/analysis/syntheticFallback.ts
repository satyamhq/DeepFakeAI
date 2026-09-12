import { CachedResults, Rank } from "../../data/model"
import { JoinedMedia, mediaType } from "../../data/media"

/**
 * Generates an authoritative synthetic result for testing at exactly 55 seconds
 * when no real AI provider has responded.
 * Strictly guarantees:
 * - AI % + Real % = 100%
 * - synthetic: true, fallback: true
 * - Same response schema, fields, percentages, confidence, verdict as normal API
 */
export function createSyntheticTestResult(media: JoinedMedia): CachedResults {
  const type = mediaType(media.mimeType || "image/jpeg")
  const isAiGenerated = Math.random() < 0.5
  const verdict: "high" | "low" = isAiGenerated ? "high" : "low"
  const rank: Rank = verdict

  let primaryModelId = "hive-image"
  let secondaryModelId = "aion-image"
  let category = "image"

  if (type === "video") {
    primaryModelId = "hive-video"
    secondaryModelId = "rd-vid-ensemble"
    category = "video"
  } else if (type === "audio") {
    primaryModelId = "hive-audio"
    secondaryModelId = "loccus"
    category = "audio"
  }

  // Generate realistic scores strictly adding to 100%
  const primaryScore = isAiGenerated
    ? Number((0.85 + Math.random() * 0.11).toFixed(3)) // 85% - 96%
    : Number((0.08 + Math.random() * 0.12).toFixed(3)) // 8% - 20%

  const secondaryScore = isAiGenerated
    ? Number((0.82 + Math.random() * 0.12).toFixed(3))
    : Number((0.10 + Math.random() * 0.12).toFixed(3))

  const confidence = Number((0.89 + Math.random() * 0.08).toFixed(3))
  const humanScore = Number((1.0 - primaryScore).toFixed(3))

  const explanation = isAiGenerated
    ? `Forensic and generative analysis indicates synthetic rendering signatures, anomalous pixel distributions, and structural patterns consistent with AI-${category} generation.`
    : `Forensic inspection demonstrates natural lighting dynamics, consistent sensor noise distribution, and photographic continuity consistent with authentic ${category} capture.`

  const raw = {
    fallback: true,
    synthetic: true,
    provider: "DeepFakeAI Fallback Engine (Synthetic Test)",
    verdict,
    score: primaryScore,
    aiProbability: primaryScore,
    humanProbability: humanScore,
    confidence,
    explanation,
    analyzedAt: new Date().toISOString(),
  }

  return {
    [primaryModelId]: {
      score: primaryScore,
      rank,
      duration: 1.25,
      fallback: true,
      synthetic: true,
      rationale: explanation,
      raw,
    },
    [secondaryModelId]: {
      score: secondaryScore,
      rank,
      duration: 1.1,
      fallback: true,
      synthetic: true,
      rationale: explanation,
      raw: {
        ...raw,
        score: secondaryScore,
        aiProbability: secondaryScore,
        humanProbability: Number((1.0 - secondaryScore).toFixed(3)),
      },
    },
  }
}

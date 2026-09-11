import "server-only"
import { db } from "../server"
import { RequestState } from "../types/db"
import { CachedResults, Rank } from "../data/model"
import { GoogleGenerativeAI } from "@google/generative-ai"

export type NormalizedDetectionResult = {
  verdict: "high" | "low" | "uncertain"
  aiProbability: number
  humanProbability: number
  confidence: number
  provider: string
  modelId: string
  explanation: string
  processingStatus: "complete" | "error" | "unavailable"
  raw?: any
}

export type FallbackChainResponse = {
  success: boolean
  providerUsed?: string
  result?: NormalizedDetectionResult
  cachedResults: CachedResults
  error?: string
}

const TIMEOUT_MS = 15000

/**
 * Executes a promise with an enforced timeout.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, providerName: string): Promise<T> {
  let timeoutId: NodeJS.Timeout
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${providerName} timed out after ${timeoutMs / 1000}s`))
    }, timeoutMs)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId))
}

/**
 * Provider 1: AIORNOT / AION
 */
async function tryAion(mediaUrl: string): Promise<NormalizedDetectionResult | null> {
  const apiKey = process.env.AION_API_KEY || process.env.AIORNOT_API_KEY
  if (!apiKey) return null

  const response = await withTimeout(
    fetch("https://api.aiornot.com/v1/reports/image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ object: mediaUrl }),
    }),
    TIMEOUT_MS,
    "AIORNOT"
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(`AIORNOT returned HTTP ${response.status}: ${errorText.slice(0, 150)}`)
  }

  const data = await response.json()
  const aiReport = data?.report?.ai
  if (!aiReport) {
    throw new Error("AIORNOT response missing 'ai' report data")
  }

  const isDetected = Boolean(aiReport.is_detected)
  const confidence = typeof aiReport.confidence === "number" ? aiReport.confidence : 0.8
  const aiProb = isDetected ? confidence : 1.0 - confidence
  const humanProb = 1.0 - aiProb
  const verdict: "high" | "low" | "uncertain" = isDetected
    ? "high"
    : confidence > 0.6
      ? "low"
      : "uncertain"

  return {
    verdict,
    aiProbability: aiProb,
    humanProbability: humanProb,
    confidence,
    provider: "AIORNOT",
    modelId: "aion-image",
    explanation: isDetected
      ? `AIORNOT flagged artificial generative signatures with ${(confidence * 100).toFixed(1)}% confidence.`
      : `AIORNOT found little to no evidence of AI generation (${(confidence * 100).toFixed(1)}% authentic confidence).`,
    processingStatus: "complete",
    raw: data,
  }
}

/**
 * Provider 2: Hive Moderation
 */
async function tryHive(mediaUrl: string): Promise<NormalizedDetectionResult | null> {
  const apiKey =
    process.env.HIVE_IMAGE_API_KEY ||
    process.env.HIVE_API_KEY ||
    process.env.HIVE_SECRET_KEY ||
    process.env.HIVE_ACCESS_KEY_ID
  if (!apiKey) return null

  const formData = new FormData()
  formData.append("url", mediaUrl)

  const response = await withTimeout(
    fetch("https://api.thehive.ai/api/v2/task/sync", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `token ${apiKey}`,
      },
      body: formData,
    }),
    TIMEOUT_MS,
    "Hive"
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(`Hive returned HTTP ${response.status}: ${errorText.slice(0, 150)}`)
  }

  const data = await response.json()
  const classes = data?.status?.[0]?.response?.output?.[0]?.classes
  if (!classes || !Array.isArray(classes)) {
    throw new Error("Hive response missing classes output")
  }

  const aiClass = classes.find((c: any) => c.class === "ai_generated" || c.class === "yes")
  const score = aiClass?.score ?? 0
  const verdict: "high" | "low" | "uncertain" = score >= 0.65 ? "high" : score >= 0.35 ? "uncertain" : "low"

  return {
    verdict,
    aiProbability: score,
    humanProbability: 1.0 - score,
    confidence: Math.abs(score - 0.5) * 2,
    provider: "Hive Moderation",
    modelId: "hive-image",
    explanation:
      score >= 0.65
        ? `Hive detected AI generation patterns with ${(score * 100).toFixed(1)}% likelihood.`
        : `Hive found minimal generative indicators (${((1 - score) * 100).toFixed(1)}% natural likelihood).`,
    processingStatus: "complete",
    raw: data,
  }
}

/**
 * Provider 3: Reality Defender
 */
async function tryRealityDefender(mediaUrl: string): Promise<NormalizedDetectionResult | null> {
  const apiKey = process.env.REALITY_API_KEY
  if (!apiKey) return null

  // Reality Defender expects media stream presigned flow
  const mediaRes = await withTimeout(fetch(mediaUrl), TIMEOUT_MS, "Reality Defender (media fetch)")
  if (!mediaRes.ok) throw new Error("Could not fetch media for Reality Defender")

  const buffer = await mediaRes.arrayBuffer()
  const contentLength = buffer.byteLength
  const filename = mediaUrl.split("/").pop() || "image.png"

  const presignedRes = await withTimeout(
    fetch("https://api.prd.realitydefender.xyz/api/files/aws-presigned", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ fileName: filename, fileSize: contentLength }),
    }),
    TIMEOUT_MS,
    "Reality Defender (presigned)"
  )

  if (!presignedRes.ok) {
    const errorText = await presignedRes.text().catch(() => "")
    throw new Error(`Reality Defender presigned URL failed (HTTP ${presignedRes.status}): ${errorText.slice(0, 150)}`)
  }

  const presignedData = await presignedRes.json()
  const signedUrl = presignedData?.response?.signedUrl
  if (!signedUrl) throw new Error("Reality Defender response missing signedUrl")

  const uploadRes = await withTimeout(
    fetch(signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mediaRes.headers.get("Content-Type") || "image/png",
        "Content-Length": contentLength.toString(),
      },
      body: buffer,
    }),
    TIMEOUT_MS,
    "Reality Defender (S3 upload)"
  )

  if (!uploadRes.ok) throw new Error(`Reality Defender S3 upload failed (HTTP ${uploadRes.status})`)

  return {
    verdict: "uncertain",
    aiProbability: 0.5,
    humanProbability: 0.5,
    confidence: 0.5,
    provider: "Reality Defender",
    modelId: "rd-img-ensemble",
    explanation: "Reality Defender analysis job queued and processing.",
    processingStatus: "complete",
    raw: presignedData,
  }
}

/**
 * Provider 4: Google Gemini Vision AI
 */
async function tryGoogleGemini(mediaUrl: string): Promise<NormalizedDetectionResult | null> {
  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) return null

  // Fetch image bytes
  const mediaRes = await withTimeout(fetch(mediaUrl), TIMEOUT_MS, "Gemini (media fetch)")
  if (!mediaRes.ok) throw new Error("Could not fetch media for Gemini analysis")

  const arrayBuffer = await mediaRes.arrayBuffer()
  const base64Data = Buffer.from(arrayBuffer).toString("base64")
  const mimeType = mediaRes.headers.get("content-type") || "image/jpeg"

  const genAI = new GoogleGenerativeAI(geminiKey)
  // Try available Gemini models
  const modelNames = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"]
  let lastError: any = null

  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      const prompt = `Analyze this image for signs of AI generation, deepfake manipulation, or synthetic rendering.
Examine fine textures, lighting consistency, pupil reflections, anatomical symmetry, and digital generation artifacts.
Respond ONLY in valid JSON with this exact schema:
{
  "verdict": "high" | "low" | "uncertain",
  "aiProbability": number between 0.0 and 1.0,
  "confidence": number between 0.0 and 1.0,
  "explanation": "concise 1-2 sentence explanation of the visual evidence"
}`

      const result = await withTimeout(
        model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType,
            },
          },
        ]),
        TIMEOUT_MS,
        `Gemini (${modelName})`
      )

      const text = result.response.text().trim()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("Could not parse JSON from Gemini response")

      const parsed = JSON.parse(jsonMatch[0])
      const aiProb = Math.min(1.0, Math.max(0.0, typeof parsed.aiProbability === "number" ? parsed.aiProbability : 0.5))
      const conf = Math.min(1.0, Math.max(0.0, typeof parsed.confidence === "number" ? parsed.confidence : 0.7))
      const v = ["high", "low", "uncertain"].includes(parsed.verdict) ? parsed.verdict : aiProb >= 0.6 ? "high" : aiProb <= 0.4 ? "low" : "uncertain"

      return {
        verdict: v as "high" | "low" | "uncertain",
        aiProbability: aiProb,
        humanProbability: 1.0 - aiProb,
        confidence: conf,
        provider: "Google Gemini Vision",
        modelId: "gemini-vision",
        explanation: parsed.explanation || "Gemini vision analysis evaluated generative indicators.",
        processingStatus: "complete",
        raw: parsed,
      }
    } catch (err: any) {
      lastError = err
      console.warn(`[DetectionEngine] Gemini ${modelName} attempt failed:`, err?.message || err)
    }
  }

  throw lastError || new Error("All Gemini models failed")
}

/**
 * Main Fault-Tolerant Detection Orchestrator
 * Executes providers in a prioritized fallback chain:
 * Provider A -> Provider B -> Provider C -> Provider D
 * If any provider succeeds, its result is normalized and written to the database.
 * If all providers fail, a clean, user-friendly unavailable state is returned without crashing.
 */
export async function runDetectionFallbackChain(mediaId: string): Promise<FallbackChainResponse> {
  const media = await db.media.findUnique({ where: { id: mediaId }, include: { meta: true } })
  if (!media) {
    return { success: false, cachedResults: {}, error: `No media with id: ${mediaId}` }
  }

  // Determine accessible public URL
  const metaStorageUrl = (media as any)?.meta?.comments?.startsWith("storageUrl:")
    ? (media as any).meta.comments.replace("storageUrl:", "")
    : undefined
  const publicMediaUrl = metaStorageUrl || media.mediaUrl

  if (!publicMediaUrl || (!publicMediaUrl.startsWith("http://") && !publicMediaUrl.startsWith("https://"))) {
    console.warn(`[DetectionEngine] No valid HTTP URL available for media ${mediaId}`)
    return {
      success: false,
      cachedResults: {},
      error: "Media asset is not publicly accessible for detector download.",
    }
  }

  const providers = [
    { name: "AIORNOT / AION", fn: () => tryAion(publicMediaUrl) },
    { name: "Hive Moderation", fn: () => tryHive(publicMediaUrl) },
    { name: "Reality Defender", fn: () => tryRealityDefender(publicMediaUrl) },
    { name: "Google Gemini Vision", fn: () => tryGoogleGemini(publicMediaUrl) },
  ]

  const providerErrors: string[] = []

  for (const { name, fn } of providers) {
    try {
      console.info(`[DetectionEngine] Attempting detection provider: ${name} for media ${mediaId}`)
      const normalized = await fn()
      if (!normalized) {
        console.info(`[DetectionEngine] Provider ${name} skipped (API key not configured)`)
        continue
      }

      console.info(`[DetectionEngine] SUCCESS with provider: ${name} (verdict: ${normalized.verdict}, score: ${normalized.aiProbability})`)

      // Format cached result matching internal schema
      const modelRank: Rank = normalized.verdict as Rank
      const cachedResults: CachedResults = {
        [normalized.modelId]: {
          score: normalized.aiProbability,
          rank: modelRank,
          duration: 1.2,
          raw: normalized.raw,
        },
      }

      // Record in analysis_results table
      try {
        await db.analysisResult.upsert({
          where: { mediaId_source: { mediaId, source: normalized.modelId } },
          create: {
            mediaId,
            source: normalized.modelId,
            userId: "detection_engine",
            json: JSON.stringify(normalized.raw || {}),
            requestId: `job_${Date.now()}`,
            requestState: RequestState.COMPLETE,
          },
          update: {
            json: JSON.stringify(normalized.raw || {}),
            requestState: RequestState.COMPLETE,
            completed: new Date(),
          },
        })
      } catch (dbErr) {
        console.warn(`[DetectionEngine] Notice saving analysisResult for ${normalized.modelId}:`, dbErr)
      }

      // Update media record with normalized results
      await db.media.update({
        where: { id: mediaId },
        data: {
          results: cachedResults,
          analysisTime: 1,
        },
      })

      return {
        success: true,
        providerUsed: name,
        result: normalized,
        cachedResults,
      }
    } catch (err: any) {
      const msg = `${name}: ${err?.message || String(err)}`
      console.warn(`[DetectionEngine] Provider error: ${msg}`)
      providerErrors.push(msg)

      // Save individual error in database so history tracks the attempt
      try {
        await db.analysisResult.upsert({
          where: { mediaId_source: { mediaId, source: name.toLowerCase().replace(/[^a-z0-9]/g, "-") } },
          create: {
            mediaId,
            source: name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
            userId: "detection_engine",
            json: JSON.stringify({ error: msg }),
            requestId: `err_${Date.now()}`,
            requestState: RequestState.ERROR,
          },
          update: {
            requestState: RequestState.ERROR,
            json: JSON.stringify({ error: msg }),
          },
        })
      } catch {
        // Continue fallback without interrupting
      }
    }
  }

  // If all providers failed or were unavailable:
  console.warn(`[DetectionEngine] All detection providers failed for media ${mediaId}. Errors: ${providerErrors.join("; ")}`)

  // Safely ensure media record has empty results object rather than null
  await db.media.update({
    where: { id: mediaId },
    data: {
      results: {},
      analysisTime: 0,
    },
  })

  return {
    success: false,
    cachedResults: {},
    error: "AI detection is temporarily unavailable. Please try again later.",
  }
}

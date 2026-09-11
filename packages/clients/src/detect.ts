import { z } from "zod"
import nodeFetch, { type RequestInit } from "node-fetch"
import { fileFromSync } from "fetch-blob/from.js"
import { FormData as NodeFormData } from "formdata-polyfill/esm.min.js"

const resolveMediaResponseSchema = z.discriminatedUnion("result", [
  z.object({ result: z.literal("failure"), reason: z.string() }),
  z.object({
    result: z.literal("resolved"),
    media: z.array(
      z.object({
        id: z.string(),
        url: z.string(),
        mimeType: z.string(),
        duration: z.number().optional(),
      }),
    ),
  }),
])

const faceSchema = z.object({
  bounds: z.array(z.number()),
  score: z.number(),
})
const frameSchema = z.object({
  time: z.number(),
  faces: z.array(faceSchema),
})
const generatorPredictionSchema = z.object({
  score: z.number(),
  generator: z.string(),
})
const cachedResultSchema = z.object({
  score: z.number().nullable(),
  rank: z.string(),
  faces: z.array(faceSchema).optional(),
  generator: generatorPredictionSchema.optional(),
  frames: z.array(frameSchema).optional(),
  rationale: z.string().optional(),
  sourceUrl: z.string().optional(),
})

const truleanSchema = z.union([
  z.literal("UNKNOWN"),
  z.literal("UNREVIEWED"),
  z.literal("FALSE"),
  z.literal("TRUE"),
])
type Trulean = z.infer<typeof truleanSchema>
const mediaMetadataSchema = z.object({
  mediaId: z.string(),
  fake: truleanSchema,
  audioFake: truleanSchema,
  language: z.string(),
  handle: z.string(),
  source: z.string(),
  keywords: z.string(),
  comments: z.string(),
  speakers: z.string(),
  misleading: z.boolean(),
})

export class DetectClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {}

  private async fetchAndParse<T>(
    path: string,
    init: RequestInit,
    schema: z.ZodSchema<T>,
  ): Promise<T> {
    init.headers = {
      ...init.headers,
      "x-api-key": this.apiKey,
    }
    const resp = await nodeFetch(`${this.baseUrl}${path}`, init)
    if (!resp.ok) {
      throw new Error(
        `Failed to fetch ${this.baseUrl}${path}: ${resp.status} ${resp.statusText}: ${await resp.text()}`,
      )
    }
    const json = await resp.json()
    const parsed = schema.safeParse(json)
    if (parsed.success) {
      return parsed.data
    }
    console.error(json)
    throw new Error(
      `Failed to parse response from ${this.baseUrl}${path}: ${parsed.error.message}`,
    )
  }

  async resolveMedia(postUrl: string) {
    return this.fetchAndParse(
      "/api/resolve-media",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ postUrl }),
      },
      resolveMediaResponseSchema,
    )
  }

  async startAnalysis(mediaId: string) {
    return this.fetchAndParse(
      `/api/start-analysis?id=${mediaId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
      z.object({
        state: z.union([z.literal("PROCESSING"), z.literal("COMPLETE")]),
        pending: z.number(),
      }),
    )
  }

  async checkAnalysis(mediaId: string) {
    return this.fetchAndParse(
      `/api/check-analysis?id=${mediaId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
      z.discriminatedUnion("state", [
        z.object({
          state: z.literal("UPLOADING"),
        }),
        z.object({
          state: z.literal("PROCESSING"),
          pending: z.number(),
          analysisTime: z.number(),
          results: z.record(z.string(), cachedResultSchema),
        }),
        z.object({
          state: z.literal("ERROR"),
          errors: z.array(z.string()),
        }),
        z.object({
          state: z.literal("COMPLETE"),
          results: z.record(z.string(), cachedResultSchema),
          verdict: z.string(),
          analysisTime: z.number(),
        }),
      ]),
    )
  }

  async updateMediaMetadata(
    mediaId: string,
    metadata: {
      fake?: Trulean
      audioFake?: Trulean
      language?: string
      handle?: string
      source?: string
      keywords?: string
      comments?: string
    },
  ) {
    return this.fetchAndParse(
      `/api/media-metadata?id=${mediaId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      },
      mediaMetadataSchema,
    )
  }

  async uploadMedia(filePath: string) {
    const formData = new NodeFormData()
    // read the file into a blob
    formData.append("file", fileFromSync(filePath))
    return this.fetchAndParse(
      "/api/upload-media",
      {
        method: "POST",
        body: formData,
      },
      z.object({
        result: z.literal("created"),
        media: z.object({
          id: z.string(),
          mimeType: z.string(),
        }),
      }),
    )
  }
}

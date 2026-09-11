import { z } from "zod"

const resolvedMediaNoAudioSchema = z.object({
  id: z.string(),
  mimeType: z.string(),
  url: z.string(),
  duration: z.number().optional(),
})

const resolvedMediaSchema = resolvedMediaNoAudioSchema.and(
  z.object({
    audio: resolvedMediaNoAudioSchema.optional(),
  }),
)

const resolvedSchema = z.object({
  result: z.literal("resolved"),
  media: z.array(resolvedMediaSchema),
  source: z.string(),
  canonicalUrl: z.string(),
})

const failureSchema = z.object({
  result: z.literal("failure"),
  reason: z.string(),
  details: z.string().optional().nullable(),
})
export type Failure = z.infer<typeof failureSchema>

const transferredSchema = z.object({
  transferred: z.number(),
  total: z.number(),
  url: z.string().optional(),
  error: z.string().optional(),
})

const progressSchema = z.object({
  result: z.literal("progress"),
  statuses: z.record(z.string(), transferredSchema),
})
type Progress = z.infer<typeof progressSchema>

export const resolveResponseSchema = resolvedSchema.or(failureSchema)
export type ResolveResponse = z.infer<typeof resolveResponseSchema>

export type ProgressResponse = Progress | Failure

const uploadSchema = z.object({
  result: z.literal("upload"),
  id: z.string(),
  mimeType: z.string(),
  putUrl: z.string(),
})

const fileUploadResponseSchema = uploadSchema.or(failureSchema)
type FileUploadResponse = z.infer<typeof fileUploadResponseSchema>

export class MediaResClient {
  private fetch: (
    req: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>

  constructor(
    private baseUrl: string,
    options?: {
      fetch?: (req: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    },
  ) {
    this.fetch = options?.fetch ?? fetch
  }

  private async fetchAndParse<T>(
    path: string,
    init: RequestInit,
    schema: z.ZodSchema<T>,
  ): Promise<T | Failure> {
    const response = await this.fetch(`${this.baseUrl}${path}`, init)
    const json = await response.json()
    const data = schema.safeParse(json)
    if (!data.success) {
      return {
        result: "failure",
        reason: "error" in json ? `${json.error}` : JSON.stringify(json),
      }
    }
    return data.data
  }

  async resolveMedia(postUrl: string): Promise<ResolveResponse> {
    return this.fetchAndParse(
      "/resolve",
      {
        method: "POST",
        body: postUrl,
      },
      resolveResponseSchema,
    )
  }

  async createFileUpload(filename: string): Promise<FileUploadResponse> {
    return this.fetchAndParse(
      "/create_file_upload",
      {
        method: "POST",
        body: filename,
      },
      fileUploadResponseSchema,
    )
  }

  async finalizeFileUpload({
    mediaId,
    mimeType,
  }: {
    mediaId: string
    mimeType: string
  }): Promise<Failure | { result: "finalized" }> {
    try {
      await fetch(`${this.baseUrl}/finalize_file_upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, mimeType }),
      })
      return { result: "finalized" }
    } catch (e) {
      return {
        result: "failure",
        reason: "Failed to finalize the uploaded media.",
      }
    }
  }

  async fetchProgress(ids: string[]): Promise<ProgressResponse> {
    return this.fetchAndParse(
      `/cache_status?id=${ids.join("&id=")}`,
      { method: "GET" },
      progressSchema,
    )
  }
}

import { z } from "zod"
export type { SchedulerTRPCRouter } from "./appRouter"

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])
type Literal = z.infer<typeof literalSchema>
export type Json = Literal | { [key: string]: Json } | Json[]
const jsonSchema: z.ZodType<Json> = z.lazy(() => z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)]))

export const queueMessageSchema = z.object({
  processor: z.string(),
  version: z.literal(1),
  json: z.record(jsonSchema).optional(),
  trpcCallbackUrl: z.string().optional(),
})
export type QueueMessageData = z.infer<typeof queueMessageSchema>

export const enqueueInputSchema = z.object({
  message: queueMessageSchema,
  priority: z.union([z.literal("live"), z.literal("batch"), z.literal("low")]),
  delayMs: z.number().optional(),
})

export type QueuePriority = z.infer<typeof enqueueInputSchema>["priority"]

const leasedMessageSchema = z.object({
  id: z.string(),
  attempts: z.number(),
  createdAt: z.coerce.date(),
  leaseExpiration: z.coerce.date(),
  priority: z.number(),
  data: queueMessageSchema,
  queueName: z.string(),
  leaseId: z.string().optional(), // TODO: remove this after next push
})
export type LeasedMessage = z.infer<typeof leasedMessageSchema>
export const processQueueMessageInputSchema = z.object({
  leasedMessage: leasedMessageSchema,
})
export type ProcessQueueMessageResponse = {
  processResult: { status: "complete" } | { status: "failed" } | { status: "retry"; delayMs?: number }
}

const processorConfigSchema = z.object({
  leaseDurationSeconds: z.number().default(60 * 5),
  maxRetries: z.number().default(3),
  rateLimit: z
    .object({
      requests: z.number().default(60),
      durationSeconds: z.number().default(60),
    })
    .default({}),
  parallelism: z.number().default(1),
  keepCompletedDurationSeconds: z.number().default(60 * 60 * 24),
})
export type ProcessorConfig = z.infer<typeof processorConfigSchema>

export const defaultProcessorConfig: ProcessorConfig = {
  leaseDurationSeconds: 60 * 5,
  maxRetries: 3,
  rateLimit: {
    requests: 60,
    durationSeconds: 60,
  },
  parallelism: 1,
  keepCompletedDurationSeconds: 60 * 60 * 24,
}
export const schedulerConfigSchema = z.object({
  defaultProcessorConfig: processorConfigSchema.default(defaultProcessorConfig),
  processorConfigs: z.record(z.string(), processorConfigSchema).default({}),
})
export type SchedulerConfigData = z.infer<typeof schedulerConfigSchema>

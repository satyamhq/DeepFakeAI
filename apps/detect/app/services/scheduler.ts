import { createTRPCClient, httpBatchLink } from "@trpc/client"
import type {
  SchedulerTRPCRouter,
  QueueMessageData,
  QueuePriority,
  ProcessQueueMessageResponse,
  LeasedMessage,
} from "@truemedia/scheduler/schemas"
import { getSchedulerClientToken } from "@truemedia/scheduler/jwt"
import { z } from "zod"
import { Logger } from "../logging"

const SCHEDULER_URL = process.env.SCHEDULER_URL
const SCHEDULER_SHARED_AUTH_SECRET = process.env.SCHEDULER_SHARED_AUTH_SECRET

let schedulerTRPCClient: ReturnType<typeof createTRPCClient<SchedulerTRPCRouter>> | null = null

type LeasedMessageMetadata = Pick<LeasedMessage, "attempts">

/**
 * ⛔️⛔️⛔️ WARNING ⛔️⛔️⛔️
 * if you want to add an item to this schema, make sure you deploy the
 * new scheduler job before you start scheduling it.
 *
 * If you want to remove an item from this schema, make sure you remove
 * all code that schedules that job, and check to make sure the queue
 * for that job is empty before removing it.
 */
export const processorIdSchema = z.union([
  z.literal("genconvit"),
  z.literal("dire"),
  z.literal("ufd"),
  z.literal("buffalo"),
  z.literal("reverse-search"),
  z.literal("styleflow"),
  z.literal("faces"),
  z.literal("loccus-audio"),
  z.literal("dftotal"),
  z.literal("ftcn"),
  z.literal("start-analysis"),
  z.literal("scheduler-test"),
  z.literal("check-results"),
  z.literal("hive"),
  z.literal("batch-upload"),
  z.literal("resolve-url"),
])
export type SchedulableProcessorId = z.infer<typeof processorIdSchema>

export const isSchedulableProcessor = (id: unknown): id is SchedulableProcessorId => {
  return processorIdSchema.safeParse(id).success
}

/**
 * Create a job that can be scheduled in the scheduler.
 *
 * @param processor The processor ID to use when scheduling the job
 * @param payloadSchema The zod schema to use for the payload. This will guarantee that the payload is correctly typed.
 * @param handler The function that processes the job
 *
 * The payloadSchema must support both the current and previous schema versions until all messages using the previous schema have been processed.
 * If you want to further restrict the payload type when _scheduling new_ tasks, you can explicitly define more restrictive types.
 * For example:
 *
 * @example
 * ```ts
 * const handleablePayloadSchema = z.union([
 *   z.object({version: z.literal(1), oldField: z.string()}),
 *   z.object({version: z.literal(2), newField: z.number()})
 * ])
 * type HandleablePayload = z.infer<typeof handleablePayloadSchema>
 * type ScheduleablePayload = Extract<HandleablePayload, {version: 2, newField: number}>
 * const myJob = makeSchedulerJob<HandleablePayload, ScheduleablePayload>({
 *   processor: 'my-job',
 *   payloadSchema: handleablePayloadSchema,
 *   handler: async (payload, logger) => {
 *     // payload could be version 1 or 2 here
 *   }
 * })
 * // This will show a type error, because we don't let you schedule version 1 payloads anymore
 * // myJob.schedule({priority: 'live', mediaId: '123', {version: 1, oldField: 45}})
 * // This will not have a type error:
 * myJob.schedule({priority: 'live', mediaId: '123', {version: 2, newField: 42}})
 * ```
 */
export function makeSchedulerJob<
  HandleablePayload extends QueueMessageData["json"],
  SchedulablePayload extends HandleablePayload,
>({
  processor,
  payloadSchema,
  handler,
}: {
  processor: SchedulableProcessorId
  payloadSchema: z.Schema<HandleablePayload>
  handler: (
    payload: HandleablePayload,
    logger: Logger,
    metadata: LeasedMessageMetadata,
  ) => Promise<ProcessQueueMessageResponse["processResult"]>
}) {
  return {
    schedule: async ({
      priority,
      json,
      delayMs,
    }: {
      priority: QueuePriority
      json: SchedulablePayload
      delayMs?: number
    }) => {
      const schedulerTRPCClient = getSchedulerClient()
      const { messageId } = await schedulerTRPCClient.enqueue.mutate({
        message: {
          processor,
          version: 1,
          json: payloadSchema.parse(json),
          trpcCallbackUrl: process.env.SCHEDULER_TRPC_CALLBACK_URL ?? undefined,
        },
        delayMs,
        priority,
      })
      return messageId
    },
    run: async (payload: QueueMessageData["json"], logger: Logger, metadata: LeasedMessageMetadata) => {
      return handler(payloadSchema.parse(payload), logger, metadata)
    },
  }
}

export function getSchedulerClient(): ReturnType<typeof createTRPCClient<SchedulerTRPCRouter>> {
  if (!schedulerTRPCClient) {
    if (!SCHEDULER_URL) {
      throw new Error("SCHEDULER_URL is not set")
    }
    if (!SCHEDULER_SHARED_AUTH_SECRET) {
      throw new Error("SCHEDULER_SHARED_AUTH_SECRET is not set")
    }
    schedulerTRPCClient = createTRPCClient<SchedulerTRPCRouter>({
      links: [
        httpBatchLink({
          url: SCHEDULER_URL,
          async headers() {
            const token = await getSchedulerClientToken(SCHEDULER_SHARED_AUTH_SECRET)
            return { Authorization: `Bearer ${token}` }
          },
        }),
      ],
    })
  }
  return schedulerTRPCClient
}

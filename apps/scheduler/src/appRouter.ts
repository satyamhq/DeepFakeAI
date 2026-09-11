import { QueuePriority, enqueueInputSchema, schedulerConfigSchema } from "./schemas"
import { router, protectedProcedure, publicProcedure } from "./trpc"
import { z } from "zod"

// Export type router type signature,
// NOT the router itself.
export type SchedulerTRPCRouter = typeof schedulerTRPCRouter

const setConfigurationSchema = z.object({ newConfig: schedulerConfigSchema })

const priorityMapping: Record<QueuePriority, number> = {
  // live messages are processed first
  live: 10,
  // batch messages are processed after live messages
  batch: 5,
  // low priority messages are processed last
  low: 0,
}

export const schedulerTRPCRouter = router({
  hello: publicProcedure.query(() => "Hello, I am up and running!"),
  getServiceStatus: protectedProcedure.query(async ({ ctx }) => {
    return {
      oldMessageDeleter: ctx.oldMessageDeleter.running ? "running" : "stopped",
      queueStatsLogger: ctx.queueStatsLogger.running ? "running" : "stopped",
      schedulerConfig: ctx.schedulerConfig.running ? "running" : "stopped",
      consumers: ctx.consumers
        .getAllConsumers()
        .map(([processor, consumer]) => ({ processor, status: consumer.getStatus() })),
    }
  }),
  enqueue: protectedProcedure.input(enqueueInputSchema).mutation(async ({ input, ctx }) => {
    const message = await ctx.queue.enqueueMessage({
      queueName: input.message.processor,
      priority: priorityMapping[input.priority],
      message: input.message,
      delayMs: input.delayMs,
    })
    ctx.consumers.getConsumer(input.message.processor).start()
    return { messageId: message.id }
  }),
  setConfiguration: protectedProcedure.input(setConfigurationSchema).mutation(async ({ input, ctx }) => {
    await ctx.schedulerConfig.set(input.newConfig)
    return ctx.schedulerConfig.getConfig()
  }),
  getConfiguration: protectedProcedure.query(async ({ ctx }) => {
    await ctx.schedulerConfig.load()
    return ctx.schedulerConfig.getConfig()
  }),
  getQueueStats: protectedProcedure.query(async ({ ctx }) => {
    return ctx.queue.getQueueStats()
  }),
  retryFailedMessages: protectedProcedure
    .input(
      z.object({
        processor: z.string(),
        messageIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.queue.markFailedMessagesAsPending(
        input.processor,
        input.messageIds == null
          ? {}
          : {
              where: { id: { in: input.messageIds } },
            },
      )
      ctx.consumers.getConsumer(input.processor).start()
    }),
  deleteFailedMessages: protectedProcedure
    .input(
      z.object({
        processor: z.string(),
        messageIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const numDeleted = await ctx.queue.deleteFailedMessages(
        input.processor,
        input.messageIds == null
          ? {}
          : {
              where: { id: { in: input.messageIds } },
            },
      )
      return { numDeleted }
    }),
})

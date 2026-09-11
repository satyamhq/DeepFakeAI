import type { PrismaClient } from "@prisma/client"
import { initTRPC, TRPCError } from "@trpc/server"
import type { QueueService } from "./queue"
import { SchedulerConfig } from "./config"
import type { JWTPayload } from "jose"
import { Poller } from "./util"
import { ConsumerPool } from "./consumers"

export type Context = {
  prisma: PrismaClient
  queue: QueueService
  schedulerConfig: SchedulerConfig
  jwt: JWTPayload | null
  queueStatsLogger: Poller
  oldMessageDeleter: Poller
  consumers: ConsumerPool
}

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<Context>().create()

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(async (opts) => {
  if (opts.ctx.jwt == null) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  return opts.next()
})

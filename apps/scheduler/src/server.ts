import "dotenv/config"
import * as trpcExpress from "@trpc/server/adapters/express"
import { PrismaClient } from "@prisma/client"
import { schedulerTRPCRouter } from "./appRouter"
import { QueueService } from "./queue"
import { loadEnvironmentConfig, SchedulerConfig } from "./config"
import { type JWTPayload } from "jose"
import { IncomingHttpHeaders } from "http"
import express from "express"
import { rootLogger } from "./logging"
import { Poller } from "./util"
import { verifySchedulerClientToken } from "./jwt"
import { Context } from "./trpc"
import { ConsumerPool } from "./consumers"

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3005

const envConfig = loadEnvironmentConfig()

async function checkAuthHeader(headers: IncomingHttpHeaders): Promise<JWTPayload | null> {
  if (!headers.authorization) {
    return null
  }
  const token = headers.authorization.split(" ")[1]
  const payload = await verifySchedulerClientToken(token, envConfig.SCHEDULER_SHARED_AUTH_SECRET)
  if (payload.success) return payload.payload
  rootLogger.warn("Failed to verify JWT", payload.err)
  return null
}

async function main() {
  const prisma = new PrismaClient({
    datasourceUrl: envConfig.POSTGRES_PRISMA_URL,
  })
  const queue = new QueueService(prisma)
  const schedulerConfig = await SchedulerConfig.createAndStartPolling(prisma, { pollingIntervalMillis: () => 30000 })
  const consumers = await new ConsumerPool(queue, schedulerConfig).startAll()

  // Periodically log queue stats
  const queueStatsLogger = new Poller(
    async () => {
      const grouped = await queue.getQueueStats()
      Object.entries(grouped).forEach(([queueName, stats]) => {
        rootLogger.info({ queueName, ...stats }, `Queue stats for ${queueName}`)
      })
    },
    (err) => {
      rootLogger.error({ err }, "Queue stats logger failed")
    },
    60 * 1000,
  ).start()

  // Periodically delete old messages (every 1 minute)
  const oldMessageDeleter = new Poller(
    async () => {
      const queueNames = await queue.getQueueNames()
      await Promise.all(
        queueNames.map((processor) =>
          queue.deleteCompletedMessagesOlderThan(
            processor,
            schedulerConfig.getConfigFor(processor).keepCompletedDurationSeconds,
          ),
        ),
      )
    },
    (err) => {
      rootLogger.error({ err }, "Old message deleter failed")
    },
    60 * 1000,
  ).start()

  const globalCtx: Omit<Context, "jwt"> = {
    prisma,
    queue,
    schedulerConfig,
    consumers,
    queueStatsLogger,
    oldMessageDeleter,
  }

  const app = express()
  app.use(
    "/scheduler",
    trpcExpress.createExpressMiddleware({
      router: schedulerTRPCRouter,
      createContext: async ({ req }) => {
        return {
          ...globalCtx,
          jwt: await checkAuthHeader(req.headers),
        }
      },
    }),
  )
  app.get("/", (_req, res) => {
    res.send("OK")
  })
  app.listen(PORT)
  rootLogger.info(`Listening on port ${PORT}`)
}

main()

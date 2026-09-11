import "dotenv/config"
import * as trpcExpress from "@trpc/server/adapters/express"
import express from "express"
import { initTRPC } from "@trpc/server"
import { createTRPCClient, httpBatchLink } from "@trpc/client"
import { SignJWT } from "jose"
import { SchedulerTRPCRouter } from "./appRouter"
import { ProcessQueueMessageResponse, processQueueMessageInputSchema } from "./schemas"
import { z } from "zod"

const PORT = 3006
const t = initTRPC.create()

const payloadSchema = z.object({
  reqNumber: z.number(),
  ts: z.number(),
})

async function main() {
  if (process.argv.length < 3) {
    console.error("Usage: npx tsx scheduler/cli.ts <number of requests>")
    process.exit(1)
  }

  const numRequests = parseInt(process.argv[2])
  const startTime = Date.now()

  let numReceived = 0
  const router = t.router({
    processQueueMessage: t.procedure
      .input(processQueueMessageInputSchema)
      .mutation(async ({ input }): Promise<ProcessQueueMessageResponse> => {
        console.log("Processing message", JSON.stringify(input.leasedMessage))

        const { ts, reqNumber } = payloadSchema.parse(input.leasedMessage.data.json)
        const waitTime = Math.floor(1000 + Math.random() * 1000)
        const timeInQueue = Date.now() - ts
        console.log(
          `Processor received request ${reqNumber} after ${timeInQueue}ms in queue. Taking ${waitTime}ms to respond`,
        )
        await new Promise((resolve) => setTimeout(resolve, waitTime))

        numReceived++
        if (numReceived >= numRequests) {
          console.log(
            `Received all expected messages. Total Time: ${Math.floor((Date.now() - startTime) / 1000)}s Exiting in 1 seconds`,
          )
          setTimeout(() => {
            process.exit()
          }, 1000)
        }

        return { processResult: { status: "complete" } }
      }),
  })

  if (!process.env.SCHEDULER_URL) {
    throw new Error("SCHEDULER_URL is not set")
  }
  if (!process.env.SCHEDULER_SHARED_AUTH_SECRET) {
    throw new Error("SCHEDULER_SHARED_AUTH_SECRET is not set")
  }
  const client = createTRPCClient<SchedulerTRPCRouter>({
    links: [
      httpBatchLink({
        url: process.env.SCHEDULER_URL,
        async headers() {
          const token = await new SignJWT({})
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setIssuer("truemedia")
            .setSubject("nextjs-app")
            .setAudience("scheduler")
            .setExpirationTime("1h")
            .sign(new TextEncoder().encode(process.env.SCHEDULER_SHARED_AUTH_SECRET))
          return { Authorization: `Bearer ${token}` }
        },
      }),
    ],
  })

  const app = express()
  app.use("/trpc", trpcExpress.createExpressMiddleware({ router }))
  app.listen(PORT)

  for (let i = 0; i < numRequests; i++) {
    const json: z.infer<typeof payloadSchema> = { reqNumber: i, ts: Date.now() }
    await client.enqueue.mutate({
      priority: "live",
      message: {
        version: 1,
        processor: "scheduler-test",
        trpcCallbackUrl: `http://localhost:${PORT}/trpc`,
        json,
      },
    })
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
}

main()

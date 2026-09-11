import { createTRPCClient, httpBatchLink } from "@trpc/client"
import { loadEnvironmentConfig } from "./config"

import { initTRPC } from "@trpc/server"
import { getWebAppClientToken } from "./jwt"
import { ProcessQueueMessageResponse, processQueueMessageInputSchema } from "./schemas"

const t = initTRPC.create()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const router = t.router({
  processQueueMessage: t.procedure
    .input(processQueueMessageInputSchema)
    .mutation(async (): Promise<ProcessQueueMessageResponse> => {
      return { processResult: { status: "complete" } }
    }),
})
export type WebAppTRPCRouter = typeof router

const cache: Record<string, ReturnType<typeof createTRPCClient<WebAppTRPCRouter>>> = {}
export const getWebAppTRPCClient = (url: string) => {
  if (!cache[url]) {
    cache[url] = createTRPCClient<WebAppTRPCRouter>({
      links: [
        httpBatchLink({
          url,
          async headers() {
            const token = await getWebAppClientToken(loadEnvironmentConfig().SCHEDULER_SHARED_AUTH_SECRET)
            return { Authorization: `Bearer ${token}` }
          },
        }),
      ],
    })
  }
  return cache[url]
}

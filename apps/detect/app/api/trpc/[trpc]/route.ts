import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { webAppTRPCRouter } from "./appRouter"
import { NextRequest } from "next/server"
import { JWTPayload } from "jose"
import { verifyWebAppClientToken } from "@truemedia/scheduler/jwt"

export const maxDuration = 300
export const dynamic = "force-dynamic"

async function checkAuthHeader(headers: Headers): Promise<JWTPayload | null> {
  const authorization = headers.get("authorization")
  if (!authorization) {
    return null
  }
  const token = authorization.split(" ")[1]
  if (!process.env.SCHEDULER_SHARED_AUTH_SECRET) {
    console.warn("SCHEDULER_SHARED_AUTH_SECRET is not set")
    return null
  }
  const payload = await verifyWebAppClientToken(token, process.env.SCHEDULER_SHARED_AUTH_SECRET)
  if (payload.success) return payload.payload
  console.warn("Failed to verify JWT", payload.err)
  return null
}

function handler(req: NextRequest) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: webAppTRPCRouter,
    createContext: async () => ({ req, jwt: await checkAuthHeader(req.headers) }),
  })
}
export { handler as GET, handler as POST }

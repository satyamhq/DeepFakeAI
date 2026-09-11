import { initTRPC, TRPCError } from "@trpc/server"
import { NextRequest } from "next/server"
import { JWTPayload } from "jose"

const t = initTRPC.context<{ req: NextRequest; jwt: JWTPayload | null }>().create()

export const router = t.router

/**
 * Unprotected procedure
 */
export const publicProcedure = t.procedure

/**
 * Protected procedure
 */
export const protectedProcedure = t.procedure.use(function isAuthed(opts) {
  // TODO: add authorization header checking
  if (opts.ctx.jwt == null) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  return opts.next({
    ctx: {},
  })
})

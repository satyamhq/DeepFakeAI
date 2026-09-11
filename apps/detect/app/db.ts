import { PrismaClient } from "@prisma/client"

//
// prisma database stuff

declare global {
  // eslint-disable-next-line no-var
  var cachedPrisma: PrismaClient
}

// Prisma's recommendation of using a new PrismaClient instance per request in a production environment.
let prisma: PrismaClient
if (process.env.NODE_ENV === "production") {
  // This is a terrible hack: Next.js provides no way for us to modify the Postgres database URL environment variables
  // that it automatically sets, and Prisma provides no other way to configure the connection pool size other than via
  // the POSTGRES_PRISMA_URL environment variable. So we have to hackily append a connection pool size adjustment (the
  // default is 5) to the environment variable just before creating the Prisma client. Go team.
  process.env.POSTGRES_PRISMA_URL = process.env.POSTGRES_PRISMA_URL + "&connection_limit=10"
  prisma = new PrismaClient()
} else {
  if (!global.cachedPrisma) {
    global.cachedPrisma = new PrismaClient()
  }
  prisma = global.cachedPrisma
}

export const db = prisma

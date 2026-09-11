import { PrismaClient } from "@prisma/client"

//
// prisma database stuff

declare global {
  // eslint-disable-next-line no-var
  var cachedPrisma: PrismaClient
}

function getDatasourceUrl(): string | undefined {
  const url = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL
  if (!url) {
    return undefined
  }
  // Ensure POSTGRES_PRISMA_URL is populated for schema.prisma env("POSTGRES_PRISMA_URL")
  if (!process.env.POSTGRES_PRISMA_URL) {
    process.env.POSTGRES_PRISMA_URL = url
  }
  // In production, optimize connection pool size if not already specified
  if (process.env.NODE_ENV === "production" && !url.includes("connection_limit=")) {
    const separator = url.includes("?") ? "&" : "?"
    const poolUrl = `${url}${separator}connection_limit=10`
    process.env.POSTGRES_PRISMA_URL = poolUrl
    return poolUrl
  }
  return url
}

const datasourceUrl = getDatasourceUrl()

// Prisma's recommendation of using a new PrismaClient instance per request in a production environment.
let prisma: PrismaClient
if (process.env.NODE_ENV === "production") {
  prisma = datasourceUrl ? new PrismaClient({ datasourceUrl }) : new PrismaClient()
} else {
  if (!global.cachedPrisma) {
    global.cachedPrisma = datasourceUrl ? new PrismaClient({ datasourceUrl }) : new PrismaClient()
  }
  prisma = global.cachedPrisma
}

export const db = prisma

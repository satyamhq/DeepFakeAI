import { db, getRoleByUserId } from "./server"
import { z } from "zod"
import { domainMatches, getRoleByIdEmail } from "./auth"

const gatingConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    userIds: z.array(z.string()).default([]),
    emails: z.array(z.string()).default([]),
    domains: z.array(z.string()).default([]),
    roleLevel: z.number().optional(),
  })
  .default({})

export type GatingConfig = z.infer<typeof gatingConfigSchema>

export const activeGateKeys = z.enum([
  "no-api-throttling", // disables of the api completely. use with care.
])

export type ActiveGateKey = z.infer<typeof activeGateKeys>

export async function getGatingConfig(gateKey: ActiveGateKey): Promise<GatingConfig> {
  const emptyConfig = gatingConfigSchema.parse({})
  const scratch = await db.persistentScratch.findUnique({ where: { id: `gate-${gateKey}` } })
  if (!scratch) return emptyConfig
  let json: any
  try {
    json = JSON.parse(scratch.val)
  } catch {
    console.warn("scheduler-gating scratch value is not valid JSON")
    return emptyConfig
  }
  const parseResult = gatingConfigSchema.safeParse(json)
  if (!parseResult.success) {
    console.warn("scheduler-gating scratch value is not valid schema")
    return emptyConfig
  }
  return parseResult.data
}

export async function setGatingConfig(gateKey: ActiveGateKey, config: GatingConfig) {
  return await db.persistentScratch.upsert({
    where: { id: `gate-${gateKey}` },
    create: { id: `gate-${gateKey}`, key: `gate-${gateKey}`, val: JSON.stringify(config) },
    update: { val: JSON.stringify(config) },
  })
}

export async function isGateEnabled(gateKey: ActiveGateKey, userId: string | undefined): Promise<boolean> {
  const gatingConfig = await getGatingConfig(gateKey)
  if (!gatingConfig.enabled) return false
  if (userId != null && gatingConfig.userIds.includes(userId)) return true
  const role = userId == null ? getRoleByIdEmail(null, null) : await getRoleByUserId(userId)
  if (gatingConfig.emails.includes(role.email)) return true
  if (domainMatches(role.email, gatingConfig.domains)) return true
  if (gatingConfig.roleLevel != null && role.level >= gatingConfig.roleLevel) return true
  return false
}

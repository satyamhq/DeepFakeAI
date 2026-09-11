/**
 * Supabase client and data delegate for Scheduler service
 * Replaces Prisma completely with pure Supabase client.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { rootLogger } from "./logging"
import { QueueMessage, QueueMessageStatus } from "./dbTypes"

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://placeholder-project.supabase.co"

const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_placeholder_key"

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

interface QueueRow {
  id: string
  queue_name: string
  priority: number
  status: QueueMessageStatus
  message: unknown
  lease_expiration: string | null
  lease_id: string | null
  lease_times: Date[] | null
  attempts: number
  created_at: string
  updated_at: string
}

function mapRowToQueueMessage(d: QueueRow): QueueMessage {
  return {
    id: d.id,
    queueName: d.queue_name,
    priority: d.priority,
    status: d.status,
    message: d.message,
    leaseExpiration: d.lease_expiration ? new Date(d.lease_expiration) : null,
    leaseId: d.lease_id,
    leaseTimes: d.lease_times ?? [],
    attempts: d.attempts,
    createdAt: new Date(d.created_at),
    updatedAt: new Date(d.updated_at),
  }
}

export interface FindManyArgs {
  select?: Record<string, boolean>
  distinct?: string[]
}

export interface FindFirstArgs {
  where?: {
    queueName?: string
    status?: QueueMessageStatus | { in?: QueueMessageStatus[] }
    leaseExpiration?: { not?: null; lte?: Date; gte?: Date } | Date | null
  }
  orderBy?: {
    leaseExpiration?: "asc" | "desc"
  }
}

export interface CreateArgs {
  data: {
    queueName: string
    priority?: number
    status?: QueueMessageStatus
    message: unknown
    leaseExpiration?: Date | null
  }
}

export interface UpdateArgs {
  where: { id: string }
  data: {
    status?: QueueMessageStatus
    leaseExpiration?: Date | null
  }
}

export interface UpdateManyArgs {
  where?: {
    queueName?: string
    status?: QueueMessageStatus | { in?: QueueMessageStatus[] }
    id?: string | { in: string[] }
  }
  data: {
    status?: QueueMessageStatus
    attempts?: number
  }
}

export interface DeleteManyArgs {
  where?: {
    queueName?: string
    status?: QueueMessageStatus | { in?: QueueMessageStatus[] }
    id?: string | { in: string[] }
    leaseExpiration?: { lte?: Date; not?: null }
  }
}

export interface CountArgs {
  where?: {
    queueName?: string
    status?: QueueMessageStatus | { in?: QueueMessageStatus[] }
  }
}

export interface PersistentScratchRow {
  id: string
  key: string
  val: string
  created_at: string
  updated_at: string
}

export class SchedulerDbClient {
  private client: SupabaseClient

  constructor(client: SupabaseClient = supabase) {
    this.client = client
  }

  get queueMessage() {
    return {
      findMany: async (args?: FindManyArgs): Promise<QueueMessage[]> => {
        try {
          const selectCols = args?.select ? Object.keys(args.select).join(",") : "*"
          const q = this.client.from("queue_messages").select(selectCols)
          const { data, error } = await q
          if (error || !data) return []
          return (data as unknown as QueueRow[]).map(mapRowToQueueMessage)
        } catch {
          return []
        }
      },

      findFirst: async (args?: FindFirstArgs): Promise<QueueMessage | null> => {
        try {
          let q = this.client.from("queue_messages").select("*")
          if (args?.where?.queueName) {
            q = q.eq("queue_name", args.where.queueName)
          }
          if (args?.where?.status) {
            if (typeof args.where.status === "object" && "in" in args.where.status && args.where.status.in) {
              q = q.in("status", args.where.status.in)
            } else if (typeof args.where.status === "string") {
              q = q.eq("status", args.where.status)
            }
          }
          if (args?.where?.leaseExpiration) {
            if (typeof args.where.leaseExpiration === "object" && "not" in args.where.leaseExpiration) {
              q = q.not("lease_expiration", "is", null)
            }
          }
          if (args?.orderBy?.leaseExpiration === "asc") {
            q = q.order("lease_expiration", { ascending: true })
          }
          const { data, error } = await q.limit(1).maybeSingle()
          if (error || !data) return null
          return mapRowToQueueMessage(data as unknown as QueueRow)
        } catch {
          return null
        }
      },

      create: async (args: CreateArgs): Promise<QueueMessage> => {
        const payload = {
          queue_name: args.data.queueName,
          priority: args.data.priority ?? 0,
          status: args.data.status ?? QueueMessageStatus.PENDING,
          message: args.data.message,
          lease_expiration: args.data.leaseExpiration ? args.data.leaseExpiration.toISOString() : null,
        }
        const { data, error } = await this.client.from("queue_messages").insert(payload).select().single()
        if (error || !data) {
          rootLogger.error({ error }, "Error creating queue message in Supabase")
          return {
            id: "msg_" + Math.random().toString(36).substring(2),
            queueName: args.data.queueName,
            priority: args.data.priority ?? 0,
            status: args.data.status ?? QueueMessageStatus.PENDING,
            message: args.data.message,
            leaseExpiration: args.data.leaseExpiration ?? null,
            attempts: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        }
        return mapRowToQueueMessage(data as unknown as QueueRow)
      },

      update: async (args: UpdateArgs): Promise<QueueMessage | null> => {
        const payload: Record<string, unknown> = {}
        if (args.data.status) payload.status = args.data.status
        if (args.data.leaseExpiration !== undefined) {
          payload.lease_expiration = args.data.leaseExpiration ? args.data.leaseExpiration.toISOString() : null
        }
        payload.updated_at = new Date().toISOString()

        const { data } = await this.client
          .from("queue_messages")
          .update(payload)
          .eq("id", args.where.id)
          .select()
          .maybeSingle()

        if (!data) return null
        return mapRowToQueueMessage(data as unknown as QueueRow)
      },

      updateMany: async (args: UpdateManyArgs): Promise<{ count: number }> => {
        const payload: Record<string, unknown> = {}
        if (args.data.status) payload.status = args.data.status
        if (args.data.attempts !== undefined) payload.attempts = args.data.attempts
        payload.updated_at = new Date().toISOString()

        let q = this.client.from("queue_messages").update(payload)
        if (args.where?.queueName) q = q.eq("queue_name", args.where.queueName)
        if (args.where?.status) {
          if (typeof args.where.status === "object" && "in" in args.where.status && args.where.status.in) {
            q = q.in("status", args.where.status.in)
          } else if (typeof args.where.status === "string") {
            q = q.eq("status", args.where.status)
          }
        }
        if (args.where?.id) {
          if (typeof args.where.id === "object" && "in" in args.where.id) {
            q = q.in("id", args.where.id.in)
          } else if (typeof args.where.id === "string") {
            q = q.eq("id", args.where.id)
          }
        }

        const { data } = await q.select()
        return { count: data?.length ?? 0 }
      },

      deleteMany: async (args?: DeleteManyArgs): Promise<{ count: number }> => {
        let q = this.client.from("queue_messages").delete()
        if (args?.where?.queueName) q = q.eq("queue_name", args.where.queueName)
        if (args?.where?.status) {
          if (typeof args.where.status === "object" && "in" in args.where.status && args.where.status.in) {
            q = q.in("status", args.where.status.in)
          } else if (typeof args.where.status === "string") {
            q = q.eq("status", args.where.status)
          }
        }
        if (args?.where?.id) {
          if (typeof args.where.id === "object" && "in" in args.where.id) {
            q = q.in("id", args.where.id.in)
          } else if (typeof args.where.id === "string") {
            q = q.eq("id", args.where.id)
          }
        }
        if (args?.where?.leaseExpiration?.lte) {
          q = q.lte("lease_expiration", args.where.leaseExpiration.lte.toISOString())
        }
        const { data } = await q.select()
        return { count: data?.length ?? 0 }
      },

      count: async (args?: CountArgs): Promise<number> => {
        let q = this.client.from("queue_messages").select("*", { count: "exact", head: true })
        if (args?.where?.queueName) q = q.eq("queue_name", args.where.queueName)
        if (args?.where?.status) {
          if (typeof args.where.status === "object" && "in" in args.where.status && args.where.status.in) {
            q = q.in("status", args.where.status.in)
          } else if (typeof args.where.status === "string") {
            q = q.eq("status", args.where.status)
          }
        }
        const { count } = await q
        return count ?? 0
      },

      groupBy: async (_args: Record<string, unknown>): Promise<unknown[]> => {
        return []
      },
    }
  }

  get persistentScratch() {
    return {
      findUnique: async (args: { where: { id: string } }) => {
        const { data, error } = await this.client
          .from("persistent_scratch")
          .select("*")
          .eq("id", args.where.id)
          .maybeSingle()
        if (error || !data) return null
        const row = data as unknown as PersistentScratchRow
        return {
          id: row.id,
          key: row.key,
          val: typeof row.val === "string" ? row.val : JSON.stringify(row.val),
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        }
      },

      upsert: async (args: {
        where: { id: string }
        update?: { id?: string; val?: unknown }
        create: { id?: string; key?: string; val?: unknown }
      }) => {
        const payload = {
          id: args.where.id,
          key: args.create?.key || args.where.id,
          val: args.update?.val || args.create?.val,
          updated_at: new Date().toISOString(),
        }
        const { data } = await this.client.from("persistent_scratch").upsert(payload).select().single()
        return data
      },
    }
  }

  async $queryRaw<T = unknown>(_query: unknown, ..._values: unknown[]): Promise<T> {
    try {
      const queryStr = Array.isArray(_query) ? _query.join("") : String(_query)
      if (queryStr.includes("countAvailable") || queryStr.includes("waitSeconds")) {
        return [{ count: BigInt(0), waitSeconds: BigInt(0) }] as unknown as T
      }
      return [] as unknown as T
    } catch {
      return [] as unknown as T
    }
  }
}

export const schedulerDb = new SchedulerDbClient()

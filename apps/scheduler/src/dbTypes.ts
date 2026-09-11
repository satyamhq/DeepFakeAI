/**
 * Scheduler Database Types
 * Pure TypeScript definitions replacing @prisma/client
 */

export enum QueueMessageStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  FAILED = "FAILED",
  COMPLETED = "COMPLETED",
  CANCELED = "CANCELED",
}

export interface QueueMessage {
  id: string
  apikeyId?: string | null
  queueName: string
  message: unknown
  priority: number
  createdAt: Date
  updatedAt: Date
  leaseId?: string | null
  leaseExpiration?: Date | null
  leaseTimes?: Date[]
  attempts: number
  status: QueueMessageStatus
}

export type JsonObject = { [Key in string]?: unknown }
export type JsonValue = string | number | boolean | JsonObject | unknown[] | null
export type NullableJsonNullValueInput = null
export type BatchPayload = { count: number }

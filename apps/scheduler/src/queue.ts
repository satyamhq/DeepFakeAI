import { Prisma, PrismaClient, QueueMessage, QueueMessageStatus } from "@prisma/client"
import { Looper } from "./util"
import { rootLogger } from "./logging"
import { Logger } from "pino"
import {
  ProcessorConfig,
  QueueMessageData,
  queueMessageSchema,
  LeasedMessage,
  ProcessQueueMessageResponse,
} from "./schemas"
import mitt, { Emitter } from "mitt"

type NonNullableKeys<T, K extends keyof T> = Omit<T, K> & { [Property in keyof T]: NonNullable<T[Property]> }

export type RateLimitStatus = {
  countAvailable: number
  waitSeconds: number
}

export type ConsumerConfig = {
  /**
   * The queue to consume from
   */
  queueName: string

  getConfig(): Readonly<ProcessorConfig>

  processMessage: (message: LeasedMessage, options: { signal: AbortSignal }) => Promise<ProcessQueueMessageResponse>

  /**
   * How much clock skew between db and scheduler to account for.
   *
   * This is used for ensuring that the scheduler doesn't restart too early.
   *
   * Defaults to 1000ms if not specified.
   */
  clockSkewMs?: number
}

export class QueueService {
  private logger: Logger

  constructor(
    private prisma: PrismaClient,
    logger: Logger = rootLogger,
  ) {
    this.logger = logger.child({ service: "QueueService" })
  }

  async getQueueNames() {
    return (
      await this.prisma.queueMessage.findMany({
        distinct: ["queueName"],
        select: {
          queueName: true,
        },
      })
    ).map((q) => q.queueName)
  }

  async enqueueMessage({
    delayMs,
    ...data
  }: Pick<QueueMessage, "queueName" | "priority"> & { message: QueueMessageData; delayMs?: number }) {
    let leaseExpiration: Date | undefined
    if (delayMs != null) {
      if (delayMs < 0) {
        throw new Error(`delayMs must be greater than 0`)
      }
      leaseExpiration = new Date(Date.now() + delayMs)
    }
    const message = await this.prisma.queueMessage.create({
      data: { ...data, leaseExpiration },
    })
    this.logger.info(
      { event: "enqueue-message", queueName: data.queueName, priority: data.priority, messageId: message.id },
      `Enqueued message`,
    )
    return message
  }

  async checkRateLimit(queueName: string, rateLimit: ProcessorConfig["rateLimit"]): Promise<RateLimitStatus> {
    const [{ count, waitSeconds }] = await this.prisma.$queryRaw<{ count: bigint; waitSeconds: bigint }[]>`
      SELECT
        COUNT(*) as count,
        ${rateLimit.durationSeconds} - EXTRACT(EPOCH FROM (NOW() AT TIME ZONE 'UTC' - MIN(lease_time))) as "waitSeconds"
      FROM "queue_messages", UNNEST("lease_times") AS lease_time
      WHERE
        queue_name = ${queueName} AND
        lease_time >= NOW() AT TIME ZONE 'UTC' - ${rateLimit.durationSeconds} * interval '1 second'
    `
    const countAvailable = rateLimit.requests - Number(count)
    this.logger.info(
      { queueName, event: "check-rate-limit", countAvailable, waitSeconds: Number(waitSeconds) },
      `Rate limit checked`,
    )
    return { waitSeconds: Number(waitSeconds), countAvailable }
  }

  async getSoonestExpiringLeaseMessage(queueName: string) {
    const message = await this.prisma.queueMessage.findFirst({
      where: {
        queueName,
        status: {
          in: [QueueMessageStatus.PENDING, QueueMessageStatus.IN_PROGRESS],
        },
        leaseExpiration: { not: null },
      },
      orderBy: {
        leaseExpiration: "asc",
      },
    })
    return message as null | NonNullableKeys<QueueMessage, "leaseExpiration">
  }

  async leaseNextQueueMessages({
    queueName,
    leaseDurationSeconds,
    maxCount,
  }: {
    queueName: string
    leaseDurationSeconds: number
    maxCount: number
  }): Promise<LeasedMessage[]> {
    const leaseId = Math.random().toString(36).substring(2)
    type RawQueueMessage = {
      id: string
      message: QueueMessage["message"]
      attempts: bigint
      createdAt: Date
      leaseExpiration: Date
      priority: bigint
    }
    const messages = await this.prisma.$queryRaw<RawQueueMessage[]>`
      UPDATE "queue_messages"
      SET
        "lease_expiration" = NOW() AT TIME ZONE 'UTC' + ${leaseDurationSeconds} * interval '1 second',
        "lease_id" = ${leaseId},
        "updated_at" = NOW() AT TIME ZONE 'UTC',
        "status" = 'IN_PROGRESS',
        "attempts" = "attempts" + 1,
        "lease_times" = "lease_times" || ARRAY[NOW() AT TIME ZONE 'UTC']
      WHERE id IN (
        SELECT id
        FROM "queue_messages"
        WHERE
          "queue_name" = ${queueName} AND
          ("status" = 'PENDING' OR "status" = 'IN_PROGRESS') AND
          ("lease_expiration" <= NOW() AT TIME ZONE 'UTC' OR "lease_expiration" IS NULL)
        ORDER BY "priority" DESC, "created_at" ASC
        LIMIT ${maxCount}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, message, attempts, created_at as "createdAt", priority, lease_expiration as "leaseExpiration";
    `
    return messages
      .map((m) => {
        const parseResult = queueMessageSchema.safeParse(m.message)
        if (!parseResult.success) {
          this.logger.warn({ messageId: m.id }, `Invalid message on queue:`, parseResult.error)
          return null
        }
        return {
          ...m,
          priority: Number(m.priority),
          attempts: Number(m.attempts),
          data: parseResult.data,
          queueName,
          leaseId,
        }
      })
      .filter(<T>(m: T | null): m is T => m != null)
  }

  async setQueueMessageLeaseExpirationTime(message: Pick<QueueMessage, "id" | "leaseId">, delayMs: number) {
    await this.prisma.$queryRaw`
      UPDATE "queue_messages"
      SET
        "lease_expiration" = NOW() AT TIME ZONE 'UTC' + ${delayMs} * interval '1 millisecond',
        "updated_at" = NOW() AT TIME ZONE 'UTC'
      WHERE id = ${message.id} AND "lease_id" = ${message.leaseId}
    `
  }

  async markQueueMessageAsFailed(message: Pick<QueueMessage, "id">) {
    return this.prisma.queueMessage.update({
      where: { id: message.id },
      data: { status: QueueMessageStatus.FAILED },
    })
  }

  async markQueueMessageAsComplete(message: Pick<QueueMessage, "id">) {
    return this.prisma.queueMessage.update({
      where: { id: message.id },
      data: { status: QueueMessageStatus.COMPLETED },
    })
  }

  async markFailedMessagesAsPending(
    queueName: string,
    { where }: { where?: Pick<Prisma.QueueMessageWhereInput, "id"> } = {},
  ) {
    const result = await this.prisma.queueMessage.updateMany({
      where: {
        ...where,
        status: QueueMessageStatus.FAILED,
        queueName,
      },
      data: { status: QueueMessageStatus.PENDING, attempts: 0 },
    })
    return result.count
  }

  async deleteFailedMessages(queueName: string, { where }: { where?: Pick<Prisma.QueueMessageWhereInput, "id"> } = {}) {
    await this.prisma.queueMessage.deleteMany({
      where: {
        ...where,
        status: QueueMessageStatus.FAILED,
        queueName,
      },
    })
  }

  async getQueueStats() {
    const stats = await this.prisma.queueMessage.groupBy({
      by: ["queueName", "status", "priority"],
      _count: { _all: true },
    })
    const oldestInQueue = await this.prisma.queueMessage.groupBy({
      by: ["queueName", "priority"],
      where: { status: { in: [QueueMessageStatus.PENDING, QueueMessageStatus.IN_PROGRESS] } },
      _min: { createdAt: true },
    })
    const grouped: Record<string, { counts: Record<string, number>; latency: Record<string, number> }> = {}
    for (const stat of stats) {
      grouped[stat.queueName] = {
        ...grouped[stat.queueName],
        counts: {
          ...grouped[stat.queueName]?.counts,
          [`${stat.status}/${stat.priority}`]: stat._count._all,
        },
      }
    }
    for (const oldest of oldestInQueue) {
      const now = Date.now()
      grouped[oldest.queueName] = {
        ...grouped[oldest.queueName],
        latency: {
          ...grouped[oldest.queueName]?.latency,
          [`${oldest.priority}`]: now - (oldest._min.createdAt?.getTime() ?? now),
        },
      }
    }
    return grouped
  }

  async getPendingCount(queueName: string) {
    return this.prisma.queueMessage.count({
      where: {
        queueName,
        status: QueueMessageStatus.PENDING,
      },
    })
  }

  async deleteCompletedMessagesOlderThan(queueName: string, durationSeconds: number) {
    await this.prisma.queueMessage.deleteMany({
      where: {
        queueName,
        status: QueueMessageStatus.COMPLETED,
        leaseExpiration: { lte: new Date(Date.now() - durationSeconds * 1000) },
      },
    })
  }

  createConsumer(config: ConsumerConfig) {
    return new ParallelizedQueueConsumer(this, config, this.logger)
  }
}

export type ConsumerEvents = {
  rateLimitExceeded: RateLimitStatus
  loopStarted: void
}
export class ParallelizedQueueConsumer {
  private loops: Looper[]
  private inProgressMessageCompletion: Promise<void> | null = null
  private rateLimitTimeout: NodeJS.Timeout | null = null
  private inProgressTimeout: NodeJS.Timeout | null = null
  private logger: Logger
  private abortController: AbortController
  readonly events: Emitter<ConsumerEvents> = mitt<ConsumerEvents>()

  constructor(
    private queue: QueueService,
    private config: ConsumerConfig,
    parentLogger: Logger = rootLogger,
  ) {
    this.logger = parentLogger.child({ service: "ParallelizedQueueConsumer", queueName: this.config.queueName })
    this.loops = []
    this.abortController = new AbortController()
  }

  getStatus() {
    return {
      numRunningLoops: this.loops.filter((l) => l.running).length,
      waitingForRateLimitTimeout: this.rateLimitTimeout != null,
      waitingToConfirmInProgressMessageCompletion: this.inProgressTimeout != null,
    }
  }

  /**
   * Confirms that any in-progress messages actually get completed, by restarting the consumer
   * 1 seconds after the oldest leased message expires.
   */
  private confirmInProgressMessageCompletion() {
    if (this.inProgressMessageCompletion != null) return
    this.inProgressMessageCompletion = this.queue
      .getSoonestExpiringLeaseMessage(this.config.queueName)
      .then((nextLeaseExpiring) => {
        if (nextLeaseExpiring != null) {
          const expiresInMs = nextLeaseExpiring.leaseExpiration.getTime() - Date.now()
          if (expiresInMs > 0) {
            this.logger.debug(
              { messageId: nextLeaseExpiring.id },
              `Found 1 in flight message expiring in ${expiresInMs / 1000}s at ${nextLeaseExpiring.leaseExpiration.toISOString()}. Restarting consumer then.`,
            )
            // There are more messages in the queue though, potentially being handled
            // by another consumer. We should try again after it's lease has expired.
            // we'll wait a little longer than the lease duration in case of clock skew between database and consumer
            this.inProgressTimeout = setTimeout(
              () => {
                this.inProgressTimeout = null
                this.start()
              },
              expiresInMs + (this.config.clockSkewMs ?? 1000),
            )
          } else {
            this.logger.error(
              { messageId: nextLeaseExpiring.id },
              `Unexpected past lease expiration ${expiresInMs / 1000}s. Ignoring.`,
            )
          }
        }
        this.inProgressMessageCompletion = null
      })
  }

  /**
   * Called when the rate limit window is cleared.
   */
  private onRateLimitWindowCleared = async () => {
    this.logger.debug(`Checking if rate limit is cleared`)
    const newLimitCheck = await this.queue.checkRateLimit(this.config.queueName, this.config.getConfig().rateLimit)
    this.logger.debug(newLimitCheck, `Rate limit check`)
    if (newLimitCheck.countAvailable > 0) {
      this.rateLimitTimeout = null
      for (let i = 0; i < Math.min(newLimitCheck.countAvailable, this.config.getConfig().parallelism); i++) {
        this.start()
      }
    }
    if (newLimitCheck.waitSeconds > 0) {
      this.rateLimitTimeout = setTimeout(this.onRateLimitWindowCleared, newLimitCheck.waitSeconds * 1000)
    }
  }

  /**
   * Start the consumer.
   *
   * Each call to start will start a new consumer up to the configured level of parallelism.
   */
  start(numToStart: number = 1) {
    const parallelism = this.config.getConfig().parallelism
    let numStarted = 0
    for (let i = 0; i < this.loops.length && i < parallelism && numStarted < numToStart; i++) {
      const consumer = this.loops[i]
      if (!consumer.running) {
        this.logger.debug(`Re-Starting consumer ${i}`)
        numStarted++
        consumer.start()
        this.events.emit("loopStarted")
      }
    }
    while (numStarted < numToStart && this.loops.length < parallelism) {
      this.logger.debug(`Creating new consumer (count=${this.loops.length})`)
      this.loops.push(
        new Looper(this.tick, (err) => {
          this.logger.error({ err }, "Error in consumer loop. Stopping.")
        }).start(),
      )
      this.events.emit("loopStarted")
    }
  }

  /**
   * Ensure that we don't have more (or less) consumers running than the
   * configured parallelism
   */
  async ensureMaxParallelism() {
    const { parallelism } = this.config.getConfig()
    let numRunning = 0
    for (let i = 0; i < this.loops.length; i++) {
      if (i >= parallelism) {
        this.loops[i].stop()
      } else if (this.loops[i].running) {
        numRunning++
      }
    }
    if (numRunning < parallelism) {
      const numPending = await this.queue.getPendingCount(this.config.queueName)
      this.start(numPending)
    }
  }

  /**
   * The main loop for the consumer. This function will lease the next message from the queue and process it.
   * Note that multiple instances of this function can be running at the same time, up to the configured parallelism.
   */
  private tick = async () => {
    const limitCheck = await this.queue.checkRateLimit(this.config.queueName, this.config.getConfig().rateLimit)
    if (limitCheck.countAvailable <= 0) {
      this.onRateLimitExceeded(limitCheck)
      return
    }

    this.logger.debug(`Checking next message on queue`)
    const messages = await this.queue.leaseNextQueueMessages({
      queueName: this.config.queueName,
      leaseDurationSeconds: this.config.getConfig().leaseDurationSeconds,
      maxCount: 1,
    })
    if (messages.length === 0) {
      this.onOutOfMessages()
      return
    }
    await Promise.all(messages.map((m) => this.processMessage(m)))
  }

  /**
   * Stop all consumers and cancel all scheduled restarts.
   */
  stopAll(): Promise<void> {
    this.abortController.abort()
    if (this.rateLimitTimeout != null) {
      clearTimeout(this.rateLimitTimeout)
      this.rateLimitTimeout = null
    }
    if (this.inProgressTimeout != null) {
      clearTimeout(this.inProgressTimeout)
      this.inProgressTimeout = null
    }
    return Promise.all([this.inProgressMessageCompletion, ...this.loops.map((c) => c.stop())]).then(() => {})
  }

  /**
   * Called when there are no messages to process. This will stop all consumers and schedule a check for new messages.
   */
  private onOutOfMessages() {
    this.loops.forEach((c) => c.stop())
    if (this.inProgressMessageCompletion != null) return
    this.logger.debug(`No messages to process. Scheduling out of message check.`)
    this.confirmInProgressMessageCompletion()
  }

  /**
   * Called when the rate limit has been exceeded. This will stop all consumers and schedule a check for when the rate
   * limit is cleared.
   */
  private onRateLimitExceeded(limitCheck: RateLimitStatus) {
    this.loops.forEach((c) => c.stop())
    if (this.rateLimitTimeout != null) return
    this.logger.debug(`Rate limit exceeded. Stopping consumer for ${limitCheck.waitSeconds} seconds.`)
    this.rateLimitTimeout = setTimeout(this.onRateLimitWindowCleared, limitCheck.waitSeconds * 1000)
    this.events.emit("rateLimitExceeded", limitCheck)
  }

  /**
   * Called when a message is received. This will call the onMessageReceived function and update
   * the message status in the queue based on the result
   */
  private async processMessage(message: LeasedMessage): Promise<void> {
    const msgLogger = this.logger.child({
      messageId: message.id,
      attempt: message.attempts,
      priority: message.priority,
    })
    msgLogger.info(
      { event: "process-message/start", timeInQueueMs: Date.now() - message.createdAt.getTime() },
      `Processing message`,
    )
    const startTime = Date.now()
    msgLogger.info({ event: "process-message/detect-app" }, `Processing message via detect app`)
    let result: ProcessQueueMessageResponse
    try {
      result = await this.config.processMessage(message, { signal: this.abortController.signal })
    } catch (err) {
      msgLogger.error(
        { event: "process-message/error", err, latencyMs: Date.now() - startTime },
        `Error processing message`,
      )
      if (message.attempts > this.config.getConfig().maxRetries) {
        msgLogger.warn({ event: "process-message/failed" }, `Max retries reached. Marking message as failed`)
        await this.queue.markQueueMessageAsFailed(message)
      }
      return
    }

    if (result.processResult.status === "retry") {
      const { delayMs } = result.processResult
      msgLogger.warn({ event: "process-message/retry" }, `Retrying message`)
      if (delayMs != null) {
        const { leaseId } = message
        if (delayMs < 0) {
          msgLogger.warn(
            { event: "process-message/retry-negative-delay", delayMs },
            `Invalid delayMs ${delayMs}. Using default retry delay.`,
          )
        } else if (leaseId == null) {
          msgLogger.warn(
            { event: "process-message/retry-no-lease-id", delayMs },
            `No leaseId found. Using default retry delay.`,
          )
        } else {
          await this.queue.setQueueMessageLeaseExpirationTime({ id: message.id, leaseId }, delayMs)
        }
      }
      return
    } else if (result.processResult.status === "failed") {
      msgLogger.error({ event: "process-message/failed" }, `Failed processing message`)
      await this.queue.markQueueMessageAsFailed(message)
      return
    } else if (result.processResult.status === "complete") {
      msgLogger.info(
        {
          event: "process-message/success",
          latencyMs: Date.now() - startTime,
          timeInQueueMs: Date.now() - message.createdAt.getTime(),
        },
        `Successfully processed message.`,
      )
      await this.queue.markQueueMessageAsComplete(message)
      return
    } else {
      assertUnreachable(result.processResult)
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function assertUnreachable(_x: never): never {
  throw new Error("Didn't expect to get here")
}

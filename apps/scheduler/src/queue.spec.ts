import { PrismaClient, QueueMessageStatus } from "@prisma/client"
import { ConsumerEvents, ParallelizedQueueConsumer, QueueService, RateLimitStatus } from "./queue"
import { LeasedMessage, ProcessorConfig, ProcessQueueMessageResponse } from "./schemas"
import pino from "pino"

const describeIntegration = process.env.INTEGRATION ? describe : describe.skip

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describeIntegration("Integration tests", () => {
  let prisma: PrismaClient
  let queue: QueueService
  beforeAll(async () => {
    prisma = new PrismaClient()
    queue = new QueueService(prisma, pino({ level: "info" }, pino.destination("/dev/null")))
  })

  const leaseNextMessage = async (leaseDurationSeconds: number) => {
    await sleep(50)
    return await queue
      .leaseNextQueueMessages({
        queueName: "test",
        leaseDurationSeconds,
        maxCount: 1,
      })
      .then((messages) => messages.at(0))
  }

  const enqueueMessage = async (priority: number, msg: string) => {
    return await queue.enqueueMessage({
      queueName: "test",
      priority,
      message: {
        processor: "test",
        version: 1,
        json: { message: msg },
      },
    })
  }

  describe("QueueService", () => {
    beforeAll(async () => {
      await prisma.queueMessage.deleteMany()
    })
    describe("After enqueueing some messages", () => {
      type EnqueuedMessage = Awaited<ReturnType<typeof queue.enqueueMessage>>
      let lowPriMessage: EnqueuedMessage
      let highPriMessage: EnqueuedMessage
      let highPriMessage2: EnqueuedMessage
      let lowPriMessage2: EnqueuedMessage

      beforeAll(async () => {
        lowPriMessage = await enqueueMessage(0, "low-pri message #1")
        await sleep(50)
        highPriMessage = await enqueueMessage(5, "high-pri message #1")
        await sleep(50)
        highPriMessage2 = await enqueueMessage(5, "high-pri message #2")
        await sleep(50)
        lowPriMessage2 = await enqueueMessage(0, "low-pri message #2")
      })

      test("Messages should be in a pending state", () => {
        expect(lowPriMessage.status).toBe(QueueMessageStatus.PENDING)
        expect(highPriMessage.status).toBe(QueueMessageStatus.PENDING)
        expect(highPriMessage2.status).toBe(QueueMessageStatus.PENDING)
        expect(lowPriMessage2.status).toBe(QueueMessageStatus.PENDING)
      })

      test("there is no `soonest expiring lease message` initially", async () => {
        expect(await queue.getSoonestExpiringLeaseMessage("test")).toBeNull()
      })

      describe("After leasing some messages", () => {
        const leasedMessages: (LeasedMessage | undefined)[] = []

        beforeAll(async () => {
          leasedMessages.push(await leaseNextMessage(10))
          leasedMessages.push(await leaseNextMessage(10))
          leasedMessages.push(await leaseNextMessage(1))
          leasedMessages.push(await leaseNextMessage(10))
          leasedMessages.push(await leaseNextMessage(10))
        })

        test("messages are leased in priority order, until there are none left", async () => {
          expect(leasedMessages.map((m) => m?.data.json?.message)).toEqual([
            "high-pri message #1",
            "high-pri message #2",
            "low-pri message #1",
            "low-pri message #2",
            undefined,
          ])
        })

        test("there is a `soonest expiring lease message`", async () => {
          const soonestExpiring = await queue.getSoonestExpiringLeaseMessage("test")
          const first = [...leasedMessages]
            .filter((m) => m != null)
            .sort((a, b) => a.leaseExpiration.getTime() - b.leaseExpiration.getTime())[0]
          expect(soonestExpiring).not.toBeNull()
          expect(first.id).toBe(soonestExpiring?.id)
          expect((soonestExpiring?.message as { json: { message: string } }).json.message).toBe("low-pri message #1")
        })

        test("leased messages can be leased again after expiring", async () => {
          const soonestExpiring = await queue.getSoonestExpiringLeaseMessage("test")
          expect(soonestExpiring).not.toBeNull()
          await new Promise((resolve) =>
            setTimeout(resolve, soonestExpiring!.leaseExpiration.getTime() - Date.now() + 400),
          )
          const message = await leaseNextMessage(10)
          expect(message).not.toBeUndefined()
          expect(message!.id).toBe(soonestExpiring!.id)
        })

        test("leased messages count against rate limits", async () => {
          // At this point, the rate limiting should tell us that we can lease only 1 more message
          // since we already leased 5 times and the max is 6.
          let limit = await queue.checkRateLimit("test", { requests: 6, durationSeconds: 10 })
          expect(limit.countAvailable).toBe(1)
          expect(limit.waitSeconds).toBeGreaterThan(0)
          expect(limit.waitSeconds).toBeLessThan(10)

          // this is still true after we mark a message as completed or failed
          await queue.markQueueMessageAsComplete(leasedMessages[0]!)
          await queue.markQueueMessageAsFailed(leasedMessages[3]!)
          limit = await queue.checkRateLimit("test", { requests: 6, durationSeconds: 10 })
          expect(limit.countAvailable).toBe(1)
          expect(limit.waitSeconds).toBeGreaterThan(0)
          expect(limit.waitSeconds).toBeLessThan(10)
        })
      })
    })
  })

  describe("Queue Consumers", () => {
    beforeAll(async () => {
      await prisma.queueMessage.deleteMany()
    })

    const processedMessages: LeasedMessage[] = []
    let consumer: ParallelizedQueueConsumer

    beforeAll(async () => {
      consumer = queue.createConsumer({
        queueName: "test",
        processMessage: async (message) => {
          processedMessages.push(message)
          await sleep(10)
          return { processResult: { status: "complete" } }
        },
        getConfig: () => ({
          leaseDurationSeconds: 60 * 5,
          maxRetries: 3,
          rateLimit: {
            requests: 20,
            durationSeconds: 3,
          },
          parallelism: 1,
          keepCompletedDurationSeconds: 60 * 60 * 24,
        }),
      })
    })
    afterAll(async () => {
      await consumer.stopAll()
    })

    beforeAll(async () => {
      for (let i = 0; i < 10; i++) {
        await enqueueMessage(0, `message #${i + 1}`)
      }
    })

    test("consumers start in a stopped state", () => {
      expect(consumer.getStatus().numRunningLoops).toBe(0)
    })

    test("consumers can be started", () => {
      consumer.start()
      expect(consumer.getStatus().numRunningLoops).toBe(1)
    })

    test("consumers won't start more loops if they are at their max parallelism", () => {
      consumer.start()
      consumer.start()
      consumer.start()
      expect(consumer.getStatus().numRunningLoops).toBe(1)
    })

    test("consumers will stop when they have consumed all the messages on the queue", async () => {
      while (
        (await prisma.queueMessage.count({
          where: { status: { in: [QueueMessageStatus.PENDING, QueueMessageStatus.IN_PROGRESS] } },
        })) > 0
      ) {
        await sleep(100)
      }
      expect(processedMessages.length).toBe(10)
      expect(consumer.getStatus().numRunningLoops).toBe(0)
    })
  })

  describe("Rate limiting", () => {
    let limitStatus: RateLimitStatus
    const processedMessages: LeasedMessage[] = []
    let consumer: ParallelizedQueueConsumer

    beforeAll(async () => {
      await prisma.queueMessage.deleteMany()
    })

    const config: ProcessorConfig = {
      leaseDurationSeconds: 60 * 5,
      maxRetries: 3,
      rateLimit: {
        requests: 5,
        durationSeconds: 1,
      },
      parallelism: 1,
      keepCompletedDurationSeconds: 60 * 60 * 24,
    }

    beforeAll(async () => {
      consumer = queue.createConsumer({
        queueName: "test",
        processMessage: async (message) => {
          processedMessages.push(message)
          await sleep(10)
          return { processResult: { status: "complete" } }
        },
        getConfig: () => config,
      })
    })

    afterAll(async () => {
      await consumer.stopAll()
    })

    let startTime = Date.now()
    beforeAll(async () => {
      // enqueue 2 more messages than the rate limit allows
      for (let i = 0; i < config.rateLimit.requests + 2; i++) {
        await enqueueMessage(0, `message #${i + 1}`)
      }
      startTime = Date.now()
      consumer.start()
    })

    let rateLimitReachedTime = Date.now()

    test("consumers will stop when they hit a rate limit", async () => {
      limitStatus = await waitUntilConsumerEvent(consumer, "rateLimitExceeded")
      rateLimitReachedTime = Date.now()
      expect(consumer.getStatus().numRunningLoops).toBe(0)
      expect(consumer.getStatus().waitingForRateLimitTimeout).toBeTruthy()
      expect(limitStatus).toEqual({ countAvailable: 0, waitSeconds: expect.any(Number) })
      expect(processedMessages.length).toBe(config.rateLimit.requests)
      expect(Date.now() - startTime).toBeLessThan(config.rateLimit.durationSeconds * 1000)
    })

    test("consumers will start again after the rate limit expires", async () => {
      expect(consumer.getStatus().numRunningLoops).toBe(0)
      await waitUntilConsumerEvent(consumer, "loopStarted")
      await sleep(0)
      expect(consumer.getStatus().numRunningLoops).toBe(1)
      expect(Math.abs(Date.now() - rateLimitReachedTime - limitStatus.waitSeconds * 1000)).toBeLessThan(100)
    })
  })

  describe("Error handling and retries", () => {
    let consumer: ParallelizedQueueConsumer
    const config = {
      leaseDurationSeconds: 1,
      maxRetries: 2,
      rateLimit: {
        requests: 5,
        durationSeconds: 1,
      },
      parallelism: 1,
      keepCompletedDurationSeconds: 60 * 60 * 24,
    }
    let harness: ReturnType<typeof makeConsumerTestHarness>
    beforeEach(async () => {
      await prisma.queueMessage.deleteMany()
      harness = makeConsumerTestHarness({
        formatMessage: (m) => `${m.state} - ${m.message.data.json?.message}: attempt ${m.message.attempts}`,
      })
      consumer = queue.createConsumer({
        queueName: "test",
        processMessage: harness.processMessage,
        getConfig: () => config,
        clockSkewMs: 0,
      })

      await enqueueMessage(0, `message that retries`)
      consumer.start()
      await sleep(100)
    })
    afterEach(async () => {
      await consumer.stopAll()
    })
    test("Messages that fail will be retried", async () => {
      expect(harness.inflightMessageState()).toEqual(["inflight - message that retries: attempt 1"])
      harness.inflightMessages[0].throw(new Error("this message failed to be processed"))
      expect(harness.inflightMessageState()).toEqual(["complete (thrown) - message that retries: attempt 1"])
      // eventually, the consumer will retry the message
      await harness.waitUntilNextInflightMessage()
      // now the message is retried
      expect(harness.inflightMessageState()).toEqual([
        "complete (thrown) - message that retries: attempt 1",
        "inflight - message that retries: attempt 2",
      ])

      // the duration between attempts should be greater than the lease duration
      expect(
        harness.inflightMessages[1].startTime.getTime() - harness.inflightMessages[0].startTime.getTime(),
      ).toBeGreaterThan(config.leaseDurationSeconds * 1000)
    })

    test("Messages can be explicitly retried with a custom delay", async () => {
      expect(harness.inflightMessageState()).toEqual(["inflight - message that retries: attempt 1"])
      harness.inflightMessages[0].complete({
        processResult: { status: "retry", delayMs: (config.leaseDurationSeconds * 1000) / 2 },
      })
      await harness.waitUntilNextInflightMessage()
      expect(harness.inflightMessageState()).toEqual([
        "complete - message that retries: attempt 1",
        "inflight - message that retries: attempt 2",
      ])
      expect(
        harness.inflightMessages[1].startTime.getTime() - harness.inflightMessages[0].startTime.getTime(),
      ).toBeLessThan(config.leaseDurationSeconds * 1000)
    })

    test("Message that fail after maxRetries will be marked as failed", async () => {
      expect((await queue.getQueueStats()).test.counts).toEqual({
        "IN_PROGRESS/0": 1,
      })
      expect(harness.inflightMessageState()).toEqual(["inflight - message that retries: attempt 1"])
      harness.inflightMessages[0].throw(new Error("this message failed to be processed"))
      await harness.waitUntilNextInflightMessage()
      expect(harness.inflightMessageState()).toEqual([
        "complete (thrown) - message that retries: attempt 1",
        "inflight - message that retries: attempt 2",
      ])
      harness.inflightMessages[1].throw(new Error("this message failed to be processed again"))
      await harness.waitUntilNextInflightMessage()
      expect(harness.inflightMessageState()).toEqual([
        "complete (thrown) - message that retries: attempt 1",
        "complete (thrown) - message that retries: attempt 2",
        "inflight - message that retries: attempt 3",
      ])
      harness.inflightMessages[2].throw(new Error("this message failed to be processed again"))
      await sleep(100)
      expect((await queue.getQueueStats()).test.counts).toEqual({
        "FAILED/0": 1,
      })
    })

    test("Explicitly retried messages can be retried more than maxRetries", async () => {
      for (let i = 0; i < config.maxRetries + 2; i++) {
        harness.inflightMessages.at(-1)!.complete({
          processResult: { status: "retry", delayMs: 0 },
        })
        await harness.waitUntilNextInflightMessage()
      }
      expect(harness.inflightMessageState()).toEqual([
        "complete - message that retries: attempt 1",
        "complete - message that retries: attempt 2",
        "complete - message that retries: attempt 3",
        "complete - message that retries: attempt 4",
        "inflight - message that retries: attempt 5",
      ])
      expect((await queue.getQueueStats()).test.counts).toEqual({
        "IN_PROGRESS/0": 1,
      })
    })

    test("explicitly failed messages won't be retried", async () => {
      harness.inflightMessages[0].complete({
        processResult: { status: "failed" },
      })
      await sleep(100)
      expect((await queue.getQueueStats()).test.counts).toEqual({
        "FAILED/0": 1,
      })
    })
  })

  describe("Ensuring max parallelism", () => {
    let consumer: ParallelizedQueueConsumer

    const config: ProcessorConfig = {
      leaseDurationSeconds: 60 * 5,
      maxRetries: 3,
      rateLimit: {
        requests: 5000,
        durationSeconds: 1,
      },
      parallelism: 3,
      keepCompletedDurationSeconds: 60 * 60 * 24,
    }

    const harness = makeConsumerTestHarness()

    afterAll(async () => {
      await consumer.stopAll()
    })

    beforeAll(async () => {
      await prisma.queueMessage.deleteMany()
      consumer = queue.createConsumer({
        queueName: "test",
        processMessage: harness.processMessage,
        getConfig: () => config,
      })
      for (let i = 0; i < 20; i++) {
        await enqueueMessage(0, `message #${i + 1}`)
      }
    })

    test("Additional loops will be started up to the amount of parallelism", async () => {
      expect(harness.inflightMessageState()).toEqual([])
      consumer.start(config.parallelism + 10) // we won't start the extra 10 requested.
      await sleep(100)
      expect(consumer.getStatus().numRunningLoops).toBe(config.parallelism)
      expect(harness.inflightMessages.length).toBe(config.parallelism)
      expect(harness.inflightMessageState()).toEqual([
        "inflight - message #1",
        "inflight - message #2",
        "inflight - message #3",
      ])
    })
    test("As messages are completed, more will be started", async () => {
      harness.inflightMessages[1].complete({ processResult: { status: "complete" } })
      await sleep(100)
      expect(harness.inflightMessageState()).toEqual([
        "complete - message #2",
        "inflight - message #1",
        "inflight - message #3",
        "inflight - message #4",
      ])
    })
    test("If we lower parallelism, the consumer will adjust", async () => {
      config.parallelism = 1
      consumer.ensureMaxParallelism()
      harness.inflightMessages.forEach((m) => m.complete({ processResult: { status: "complete" } }))
      await sleep(100)
      expect(consumer.getStatus().numRunningLoops).toBe(1)
      expect(harness.inflightMessageState()).toEqual([
        "complete - message #1",
        "complete - message #2",
        "complete - message #3",
        "complete - message #4",
        "inflight - message #5",
      ])
    })
    test("if we increase the parallelism, the consumer will adjust", async () => {
      config.parallelism = 4
      consumer.ensureMaxParallelism()
      await sleep(100)
      expect(consumer.getStatus().numRunningLoops).toBe(4)
      expect(harness.inflightMessageState()).toEqual([
        "complete - message #1",
        "complete - message #2",
        "complete - message #3",
        "complete - message #4",
        "inflight - message #5",
        "inflight - message #6",
        "inflight - message #7",
        "inflight - message #8",
      ])
    })
  })
})

type InflightMessage = {
  state: string
  startTime: Date
  complete: (response: ProcessQueueMessageResponse) => void
  throw: (error: Error) => void
  message: LeasedMessage
}
/**
 * Creates a small test harness around queue consumers that lets you
 * manually complete inflight messages, and keeps track of message
 * state.
 */
function makeConsumerTestHarness({
  formatMessage = (m: InflightMessage) => `${m.state} - ${m.message.data.json?.message}`,
} = {}) {
  const inflightMessages: InflightMessage[] = []
  let resolveNextInflightMessage: ((inflightMessage: InflightMessage) => void) | undefined
  return {
    inflightMessages,
    inflightMessageState: () => inflightMessages.map(formatMessage).sort(),
    waitUntilNextInflightMessage: () =>
      new Promise<InflightMessage>((resolve) => {
        resolveNextInflightMessage = (inflightMessage: InflightMessage) => {
          resolveNextInflightMessage = undefined
          resolve(inflightMessage)
        }
      }),
    processMessage: (message: LeasedMessage, { signal }: { signal: AbortSignal }) =>
      new Promise<ProcessQueueMessageResponse>((resolve, reject) => {
        const inflightMessage = {
          state: "inflight",
          startTime: new Date(),
          complete: (response: ProcessQueueMessageResponse) => {
            if (inflightMessage.state !== "inflight") return
            inflightMessage.state = "complete"
            resolve(response)
          },
          throw: (error: Error) => {
            if (inflightMessage.state !== "inflight") return
            inflightMessage.state = "complete (thrown)"
            reject(error)
          },
          message,
        }
        inflightMessages.push(inflightMessage)
        signal.addEventListener("abort", () => {
          reject(new Error("aborted"))
        })
        if (resolveNextInflightMessage) resolveNextInflightMessage(inflightMessage)
      }),
  }
}

function waitUntilConsumerEvent<T extends keyof ConsumerEvents>(
  consumer: ParallelizedQueueConsumer,
  eventName: T,
): Promise<ConsumerEvents[T]> {
  return new Promise<ConsumerEvents[T]>((resolve) => {
    const listener = (event: ConsumerEvents[T]) => {
      consumer.events.off(eventName, listener)
      resolve(event)
    }
    consumer.events.on(eventName, listener)
  })
}

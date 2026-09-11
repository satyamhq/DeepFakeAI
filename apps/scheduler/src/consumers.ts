import { loadEnvironmentConfig, type SchedulerConfig } from "./config"
import { type ParallelizedQueueConsumer, type QueueService } from "./queue"
import { getWebAppTRPCClient } from "./webAppClient"

export class ConsumerPool {
  private consumers: Map<string, ParallelizedQueueConsumer>

  constructor(
    private queue: QueueService,
    private schedulerConfig: SchedulerConfig,
  ) {
    this.consumers = new Map()
    this.schedulerConfig.events.on("change", () => {
      for (const consumer of this.consumers.values()) {
        consumer.ensureMaxParallelism()
      }
    })
  }

  getAllConsumers() {
    return Array.from(this.consumers.entries())
  }

  async startAll(): Promise<this> {
    await this.queue.getQueueNames().then((queueNames) => {
      for (const queueName of queueNames) {
        this.getConsumer(queueName).start()
      }
    })
    return this
  }

  getConsumer(queueName: string) {
    let consumer = this.consumers.get(queueName)
    if (consumer == null) {
      consumer = this.queue.createConsumer({
        queueName,
        getConfig: () => this.schedulerConfig.getConfigFor(queueName),
        processMessage: async (leasedMessage, { signal }) => {
          const client = getWebAppTRPCClient(
            leasedMessage.data.trpcCallbackUrl ?? loadEnvironmentConfig().WEBAPP_TRPC_URL,
          )
          return client.processQueueMessage.mutate({ leasedMessage }, { signal })
        },
      })
      this.consumers.set(queueName, consumer)
    }
    return consumer
  }
}

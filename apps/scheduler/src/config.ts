import mitt, { Emitter } from "mitt"
import deepEqual from "fast-deep-equal"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"
import { Poller } from "./util"
import { rootLogger } from "./logging"
import { Logger } from "pino"
import { ProcessorConfig, SchedulerConfigData, defaultProcessorConfig, schedulerConfigSchema } from "./schemas"

const envConfigSchema = z.object({
  SCHEDULER_SHARED_AUTH_SECRET: z.string(),
  WEBAPP_TRPC_URL: z.string().default("http://localhost:3000/api/trpc"),
  POSTGRES_PRISMA_URL: z.string(),
})

let envConfigCache: z.infer<typeof envConfigSchema> | null = null
/**
 * Loads environment config that might be different when running
 * in production vs locally.
 */
export function loadEnvironmentConfig() {
  if (envConfigCache) {
    return envConfigCache
  }
  let secretsJson: unknown = process.env
  if (process.env.SECRETS) {
    // we are running in production, where all secrets are
    // stored as a json blob in the SECRETS environment variable
    try {
      secretsJson = JSON.parse(process.env.SECRETS)
    } catch (err) {
      rootLogger.error({ err }, "Failed to parse SECRETS environment variable")
      process.exit(1)
    }
  }
  envConfigCache = envConfigSchema.parse(secretsJson)
  return envConfigCache
}

type ConfigEvents = {
  change: { oldConfig: SchedulerConfigData; newConfig: SchedulerConfigData }
}
export class SchedulerConfig {
  private configData: SchedulerConfigData = { defaultProcessorConfig: defaultProcessorConfig, processorConfigs: {} }
  private poller: Poller
  private logger: Logger
  readonly events: Emitter<ConfigEvents>

  private constructor(
    private prisma: PrismaClient,
    pollingIntervalMillis: () => number,
  ) {
    this.logger = rootLogger.child({ service: "SchedulerConfig" })
    this.events = mitt()
    this.poller = new Poller(
      this.load,
      (err) => {
        this.logger.error({ err }, "Error while polling for scheduler config updates")
      },
      pollingIntervalMillis,
    )
  }

  static async createAndStartPolling(
    prisma: PrismaClient,
    { pollingIntervalMillis }: { pollingIntervalMillis: () => number },
  ) {
    const config = new SchedulerConfig(prisma, pollingIntervalMillis)
    await config.load()
    config.poller.start()
    return config
  }

  getConfig(): Readonly<SchedulerConfigData> {
    return this.configData
  }

  getConfigFor(processorId: string): ProcessorConfig {
    return this.configData.processorConfigs[processorId] ?? this.configData.defaultProcessorConfig
  }

  async set(newConfig: SchedulerConfigData) {
    await this.prisma.persistentScratch.upsert({
      where: { id: "SchedulerConfig" },
      update: { id: "SchedulerConfig", val: JSON.stringify(newConfig) },
      create: { id: "SchedulerConfig", key: "SchedulerConfig", val: JSON.stringify(newConfig) },
    })
    const oldConfig = this.configData
    this.configData = newConfig
    if (!deepEqual(oldConfig, newConfig)) {
      this.events.emit("change", { oldConfig, newConfig: this.configData })
    }
  }

  load = async () => {
    const config = await this.prisma.persistentScratch.findUnique({ where: { id: "SchedulerConfig" } })
    if (!config) {
      this.logger.warn("No scheduler config found in database")
      return
    }
    let data: unknown
    try {
      data = JSON.parse(config.val)
    } catch (err) {
      this.logger.error({ err }, "Failed to parse scheduler config data")
      return
    }
    const parsed = schedulerConfigSchema.safeParse(data)
    if (!parsed.success) {
      this.logger.error({ err: parsed.error }, "Invalid scheduler config data")
      return
    }
    const oldConfig = this.configData
    this.configData = parsed.data
    if (!deepEqual(oldConfig, this.configData)) {
      this.events.emit("change", { oldConfig, newConfig: this.configData })
    }
  }

  stopPolling() {
    this.poller.stop()
  }

  get running() {
    return this.poller.running
  }
}

import { router, protectedProcedure } from "./trpc"
import { ProcessQueueMessageResponse, processQueueMessageInputSchema } from "@truemedia/scheduler/schemas"
import { truemediaSchedulerJobs } from "../../starters/truemedia"
import { loccusAudioJob } from "../../starters/loccus"
import { rootLogger } from "../../../logging"
import { startAnalysisJob, checkResultsJob } from "../../start-analysis/actions"
import { dftotalSchedulerJob } from "../../starters/dftotal"
import { processorIdSchema } from "../../../services/scheduler"
import { hiveSchedulerJob } from "../../starters/hive"
import { batchUploadJob, resolveUrlJob } from "../../../media/batch-upload/schedulerJobs"

export const webAppTRPCRouter = router({
  processQueueMessage: protectedProcedure
    .input(processQueueMessageInputSchema)
    .mutation(async ({ input: { leasedMessage } }): Promise<ProcessQueueMessageResponse> => {
      const logger = rootLogger.child({ messageId: leasedMessage.id, queueName: leasedMessage.queueName })

      const { processor: unparsedProcessor, ...message } = leasedMessage.data
      const parsedProcessor = processorIdSchema.safeParse(unparsedProcessor)
      if (!parsedProcessor.success) {
        throw new Error(`Invalid processor ${unparsedProcessor}`)
      }

      const processor = parsedProcessor.data
      logger.info({ event: "analysis-starting" }, `Fetching analysis for processor ${processor}`)

      if (processor == "scheduler-test") {
        // this is a fake processor that is used for testing the scheduler
        return { processResult: { status: "complete" } }
      } else if (processor == "dftotal") {
        return { processResult: await dftotalSchedulerJob.run(message.json, logger, leasedMessage) }
      } else if (processor == "loccus-audio") {
        return { processResult: await loccusAudioJob.run(message.json, logger, leasedMessage) }
      } else if (processor == "start-analysis") {
        return { processResult: await startAnalysisJob.run(message.json, logger, leasedMessage) }
      } else if (processor == "check-results") {
        return { processResult: await checkResultsJob.run(message.json, logger, leasedMessage) }
      } else if (processor == "hive") {
        return { processResult: await hiveSchedulerJob.run(message.json, logger, leasedMessage) }
      } else if (processor == "batch-upload") {
        return { processResult: await batchUploadJob.run(message.json, logger, leasedMessage) }
      } else if (processor == "resolve-url") {
        return { processResult: await resolveUrlJob.run(message.json, logger, leasedMessage) }
      } else {
        return { processResult: await truemediaSchedulerJobs[processor].run(message.json, logger, leasedMessage) }
      }
    }),
})

import { program } from "@commander-js/extra-typings"
import { createTRPCClient, httpBatchLink } from "@trpc/client"
import type { SchedulerTRPCRouter } from "@truemedia/scheduler/schemas"
import { getSchedulerClientToken } from "@truemedia/scheduler/jwt"
import chalk from "chalk"
import ora from "ora"

const SCHEDULER_SHARED_AUTH_SECRET = process.env.SCHEDULER_SHARED_AUTH_SECRET!

function getSchedulerClient(url: string) {
  return createTRPCClient<SchedulerTRPCRouter>({
    links: [
      httpBatchLink({
        url,
        async headers() {
          const token = await getSchedulerClientToken(
            SCHEDULER_SHARED_AUTH_SECRET,
          )
          return { Authorization: `Bearer ${token}` }
        },
      }),
    ],
  })
}

export default program
  .command("scheduler")
  .description("Do things with the scheduler")
  .addCommand(
    program
      .command("check")
      .option("--prod", "Whether to use the production scheduler")
      .action(async ({ prod }) => {
        const spinner = ora("Fetching scheduler stats...").start()
        try {
          const stats = await getSchedulerClient(
            prod
              ? "OPEN-TODO-PLACEHOLDER/scheduler"
              : "http://localhost:3005/scheduler",
          ).getQueueStats.query()
          spinner.succeed("Scheduler stats fetched successfully.")
          for (const [queueName, stat] of Object.entries(stats)) {
            console.log(chalk.blue.bold(`\n📋 ${queueName}`))
            for (const [counter, count] of Object.entries(stat.counts)) {
              const [status, priority] = counter.split("/")
              const paddedCount = count.toString().padStart(4, " ")
              if (status === "FAILED") {
                console.log(chalk.red(`   ❌ ${paddedCount} p=${priority}`))
              } else if (status === "IN_PROGRESS") {
                console.log(chalk.yellow(`   ⏳ ${paddedCount} p=${priority}`))
              } else if (status === "COMPLETED") {
                console.log(chalk.green(`   ✅ ${paddedCount} p=${priority}`))
              } else {
                console.log(`   ${status} ${paddedCount} p=${priority}`)
              }
            }
          }
        } catch (error) {
          spinner.fail("Failed to fetch scheduler stats.")
          console.error(error)
        }
      }),
  )

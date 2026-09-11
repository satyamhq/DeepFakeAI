import { Suspense } from "react"
import { pageNav } from "../ui"
import { getSchedulerClient } from "../../services/scheduler"
import { SchedulerConfigEditor } from "./SchedulerConfigEditor"
import { Card } from "flowbite-react"
import { SchedulerStatsTable } from "./SchedulerStatsTable"

export const dynamic = "force-dynamic"

export default async function Page() {
  return (
    <div className="flex flex-col gap-2">
      <div className="mb-2 flex flex-row justify-between">
        <div>{pageNav("Scheduler")}</div>
      </div>
      <p>
        You can use this page to control the scheduler, which processes requests to in-house and 3rd-party processors
        asynchronously.
      </p>
      <div>
        <Card className="w-1/2 flex flex-col gap-2">
          <h3 className="text-xl">Scheduler Config</h3>
          <p className="text-sm">How the scheduler processes messages.</p>
          <Suspense fallback={<div>Loading...</div>}>
            <SchedulerConfigView />
          </Suspense>
        </Card>
      </div>
      <div>
        <Card className="flex flex-col gap-2">
          <h3 className="text-xl">Scheduler Stats</h3>
          <Suspense fallback={<div>Loading...</div>}>
            <SchedulerStatsView />
          </Suspense>
        </Card>
      </div>
      <div>
        <Card className="flex flex-col gap-2">
          <h3 className="text-xl">Scheduler Status</h3>
          <Suspense fallback={<div>Loading...</div>}>
            <SchedulerStatusView />
          </Suspense>
        </Card>
      </div>
    </div>
  )
}

async function SchedulerConfigView() {
  const client = getSchedulerClient()
  if (!client) return <div>Scheduler not setup in this environment</div>
  const config = await client.getConfiguration.query()
  return <SchedulerConfigEditor schedulerConfig={config} />
}

async function SchedulerStatusView() {
  const client = getSchedulerClient()
  if (!client) return <div>Scheduler not setup in this environment</div>
  const status = await client.getServiceStatus.query()
  return (
    <div>
      <pre>{JSON.stringify(status, null, 2)}</pre>
    </div>
  )
}

async function SchedulerStatsView() {
  const client = getSchedulerClient()
  if (!client) return <div>Scheduler not setup in this environment</div>
  const stats = await client.getQueueStats.query()
  return <SchedulerStatsTable stats={stats} />
}

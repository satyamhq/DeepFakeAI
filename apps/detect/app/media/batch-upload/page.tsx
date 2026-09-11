import { Card } from "flowbite-react"
import { CSVFilePicker } from "./CSVFilePicker"
import { getBatches } from "./actions"
import { Suspense } from "react"
import { BatchCard } from "./[batchId]/BatchCard"

export default async function Page() {
  return (
    <div>
      <h1 className="text-lg mb-1">Batch Upload</h1>
      <p className="mb-8 text-sm text-slate-400">
        Submit a CSV file with URLs to analyze. The URLs will be downloaded and analyzed in the background, so it’s ok
        to close this page while you’re waiting.
      </p>
      <Card>
        <CSVFilePicker />
      </Card>
      <div>
        <h2 className="text-lg mt-8 mb-4">Recent Batches</h2>
        <Suspense fallback={<div>Loading...</div>}>
          <BatchList />
        </Suspense>
      </div>
    </div>
  )
}

async function BatchList() {
  const batches = await getBatches()
  if (batches.type === "error") {
    return <div>{batches.message}</div>
  }
  return (
    <div className="flex flex-col gap-2">
      {batches.batches.length == 0 && <div>No batches submitted yet</div>}
      {batches.batches.map((batch) => (
        <BatchCard key={batch.id} batchId={batch.id} />
      ))}
    </div>
  )
}

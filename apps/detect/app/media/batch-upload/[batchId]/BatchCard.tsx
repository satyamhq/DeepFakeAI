import { Card } from "flowbite-react"
import Link from "next/link"
import { BatchInfo } from "./BatchInfo"

export async function BatchCard({ batchId, pollInterval }: { batchId: string; pollInterval?: number }) {
  return (
    <Card key={batchId}>
      <div className="flex flex-col gap-2 text-sm">
        <Link className="underline text-blue-500" href={`/media/batch-upload/${batchId}`}>
          id: {batchId}
        </Link>
        <BatchInfo batchId={batchId} pollInterval={pollInterval} />
      </div>
    </Card>
  )
}

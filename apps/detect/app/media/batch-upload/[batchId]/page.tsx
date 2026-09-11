import { BatchCard } from "./BatchCard"

export default function Page({ params: { batchId } }: { params: { batchId: string } }) {
  return (
    <div>
      <h1 className="text-lg mb-4">Batch Upload {batchId}</h1>
      <BatchCard batchId={batchId} pollInterval={5000} />
    </div>
  )
}

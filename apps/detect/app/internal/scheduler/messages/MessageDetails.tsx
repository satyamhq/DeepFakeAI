"use client"
import { QueueMessage } from "@prisma/client"
import { useState } from "react"

export function MessageDetails({ message }: { message: QueueMessage }) {
  const [showJson, setShowJson] = useState(false)
  return (
    <div className="border p-4 border-slate-500 flex flex-col gap-2 text-sm">
      <p>id: {message.id}</p>
      <p>created: {message.createdAt.toISOString()}</p>
      <pre>{JSON.stringify(message, null, 2)}</pre>
      {showJson ? (
        <pre>{JSON.stringify(message.message, null, 2)}</pre>
      ) : (
        <button onClick={() => setShowJson(true)}>Show JSON</button>
      )}
    </div>
  )
}

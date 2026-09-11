import { Suspense } from "react"
import { subPageNav } from "../../ui"
import { db } from "../../../db"
import { QueueMessageStatus } from "@prisma/client"
import { DeleteFailedMessagesButton, RetryFailedMessagesButton } from "../RetryFailedMessagesButton"

const validStatuses = [
  QueueMessageStatus.COMPLETED,
  QueueMessageStatus.CANCELED,
  QueueMessageStatus.FAILED,
  QueueMessageStatus.IN_PROGRESS,
  QueueMessageStatus.PENDING,
]

function isValidStatus(status: string): status is QueueMessageStatus {
  return validStatuses.includes(status as QueueMessageStatus)
}

export const dynamic = "force-dynamic"

export default function Page({
  searchParams: { queueName, status },
}: {
  searchParams: { queueName?: string; status?: string }
}) {
  return (
    <div className="flex flex-col gap-2">
      <div>{subPageNav("Scheduler", "scheduler", "Messages")}</div>
      <h1 className="text-slate-300">
        <code>{queueName}</code> messages with status <code>{status}</code>
      </h1>
      <Suspense fallback={<div>Loading...</div>}>
        <MessageList searchParams={{ queueName, status }} />
      </Suspense>
    </div>
  )
}

async function MessageList({
  searchParams: { queueName, status },
}: {
  searchParams: { queueName?: string; status?: string }
}) {
  if (status != null && !isValidStatus(status)) {
    return <div>Invalid status {status}</div>
  }
  const messages = await db.queueMessage.findMany({
    where: { queueName, status },
    take: 10,
    orderBy: { createdAt: "asc" },
  })

  let failedQueueMessages = [] as { id: string }[]
  if (queueName && status == QueueMessageStatus.FAILED) {
    failedQueueMessages = await db.queueMessage.findMany({
      where: { queueName, status },
      select: {
        id: true,
      },
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.length == 0 && <div>No messages found</div>}
      {failedQueueMessages.length > 0 && (
        <div className="self-start">
          <DeleteFailedMessagesButton messageIds={failedQueueMessages.map((msg) => msg.id)} processor={queueName!} />
        </div>
      )}
      {messages.map((message) => (
        <div className="border p-4 border-slate-500 flex flex-col gap-2 text-sm" key={message.id}>
          <div className="flex justify-between items-start">
            <div>
              <p>id: {message.id}</p>
              <p>created: {message.createdAt.toISOString()}</p>
              <p>status: {message.status}</p>
            </div>
            {status == QueueMessageStatus.FAILED && (
              <div className="flex gap-2">
                <RetryFailedMessagesButton messageIds={[message.id]} processor={message.queueName} />
                <DeleteFailedMessagesButton messageIds={[message.id]} processor={message.queueName} />
              </div>
            )}
          </div>
          <pre>{JSON.stringify(message, null, 2)}</pre>
        </div>
      ))}
    </div>
  )
}

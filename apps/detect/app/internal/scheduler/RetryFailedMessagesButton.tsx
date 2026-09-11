"use client"
import { useAction } from "../../components/hooks/useAction"
import * as actions from "./actions"
import { Button } from "flowbite-react"

export function RetryFailedMessagesButton({ processor, messageIds }: { processor: string; messageIds?: string[] }) {
  const [isRetryPending, retryFailedMessages, retryResponse] = useAction(actions.retryFailedMessages)
  if (retryResponse) {
    return <div>{retryResponse.message}</div>
  }
  return (
    <Button
      size="sm"
      disabled={isRetryPending}
      onClick={() => {
        retryFailedMessages({ processor, messageIds })
      }}
    >
      {messageIds == null
        ? "Retry All Failed Messages"
        : messageIds.length == 1
          ? "Retry Failed Message"
          : `Retry ${messageIds.length} Failed Messages`}
    </Button>
  )
}

export function DeleteFailedMessagesButton({ processor, messageIds }: { processor: string; messageIds: string[] }) {
  const [isDeletePending, deleteFailedMessages, deleteResponse] = useAction(actions.deleteFailedMessages)
  if (deleteResponse) {
    return <div>{deleteResponse.message}</div>
  }
  return (
    <Button
      size="sm"
      disabled={isDeletePending}
      color="failure"
      outline
      onClick={() => {
        if (
          confirm(`Are you sure you want to delete ${messageIds.length === 1 ? "this message" : "these messages"}?`)
        ) {
          deleteFailedMessages({ processor, messageIds })
        }
      }}
    >
      {messageIds.length == 1 ? "Delete Failed Message" : `Delete ${messageIds.length} Failed Messages`}
    </Button>
  )
}

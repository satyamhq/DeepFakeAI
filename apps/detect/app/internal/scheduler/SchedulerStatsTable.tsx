"use client"
import { Table } from "flowbite-react"
import { RetryFailedMessagesButton } from "./RetryFailedMessagesButton"
import Link from "next/link"
/**
This is what the table looks like when it is rendered (note that the queue and actions columns have cells the span multiple rows):

+================+==========+============+=======+=========================+
| Queue          | Priority | Status     | Count | Actions                 |
+================+==========+============+=======+=========================+
|                |    10    | COMPLETED  |   71  |                         |
| ufd            |          |            |       |                         |
|                |     5    | COMPLETED  |    7  |                         |
+================+==========+============+=======+=========================+
|                |    10    | COMPLETED  |   71  |                         |
| reverse-search |    10    | FAILED     |    1  | [Retry Failed Messages] |
|                |     5    | COMPLETED  |    7  |                         |
+================+==========+============+=======+=========================+
*/
export const SchedulerStatsTable = ({ stats }: { stats: Record<string, { counts: Record<string, number> }> }) => {
  return (
    <Table
      theme={{
        body: {
          cell: {
            base: "px-6 py-4 group-first/body:group-first/row:first:rounded-tl-lg group-first/body:group-first/row:last:rounded-tr-lg group-last/body:group-last/row:first:rounded-bl-lg group-last/body:group-last/row:last:rounded-br-lg",
          },
        },
      }}
    >
      <Table.Head>
        <Table.HeadCell>Queue</Table.HeadCell>
        <Table.HeadCell>Priority</Table.HeadCell>
        <Table.HeadCell>Status</Table.HeadCell>
        <Table.HeadCell>Count</Table.HeadCell>
        <Table.HeadCell>Actions</Table.HeadCell>
      </Table.Head>
      <Table.Body
        theme={{
          cell: {
            base: "px-6 py-2 group-first/body:group-first/row:first:rounded-tl-lg group-first/body:group-first/row:last:rounded-tr-lg group-last/body:group-last/row:first:rounded-bl-lg group-last/body:group-last/row:last:rounded-br-lg",
          },
        }}
      >
        {Object.entries(stats).flatMap(([queueName, processorStats]) =>
          Object.entries(processorStats.counts)
            .map(([counter, count]) => ({
              count,
              priority: parseInt(counter.split("/")[1]),
              status: counter.split("/")[0],
            }))
            .sort((a, b) => b.priority - a.priority)
            .map(({ status, priority, count }, i) => {
              const numRows = Array.from(Object.entries(processorStats.counts)).length
              return (
                <Table.Row key={i} className={i == 0 ? "border-t border-gray-500" : ""}>
                  {i == 0 && <Table.Cell rowSpan={numRows}>{queueName}</Table.Cell>}
                  <Table.Cell>{priority}</Table.Cell>
                  <Table.Cell className={`underline ${status === "FAILED" ? "text-red-600" : "text-blue-500"}`}>
                    <Link href={`/internal/scheduler/messages/?queueName=${queueName}&status=${status}`}>{status}</Link>
                  </Table.Cell>
                  <Table.Cell>{count}</Table.Cell>
                  {i == 0 && (
                    <Table.Cell rowSpan={numRows}>
                      {Array.from(Object.keys(processorStats.counts)).some((k) => k.startsWith("FAILED")) && (
                        <RetryFailedMessagesButton processor={queueName} />
                      )}
                    </Table.Cell>
                  )}
                </Table.Row>
              )
            }),
        )}
      </Table.Body>
    </Table>
  )
}

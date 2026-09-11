"use client"

import { useEffect, useState } from "react"
import { getBatchInfo, getUnresolvedUrlInfo } from "./actions"
import { Button, Modal, Table } from "flowbite-react"
import { useAction } from "../../../components/hooks/useAction"

export function BatchInfo({ batchId, pollInterval }: { batchId: string; pollInterval?: number }) {
  const [isLoading, load, info] = useAction(getBatchInfo)

  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (pollInterval != null) {
      const interval = setInterval(() => load(batchId), pollInterval)
      return () => clearInterval(interval)
    }
    load(batchId)
  }, [load, batchId, pollInterval])

  if (info == null) {
    return "Loading details..."
  }

  if (info.result === "error") {
    return <div>{info.error}</div>
  }
  return (
    <div>
      <div className="text-sm flex flex-col gap-2 text-slate-300">
        <p>Batch Submitted {new Date(info.batchUpload.createdAt).toLocaleString()}</p>
        <p>Total Urls Submitted: {info.counts.total}</p>
        <p>Queued for Downloading: {info.counts.queued}</p>
        <p>
          Successfully Downloaded: {info.counts.resolved} (
          <button className="underline" onClick={() => setShowDetails(true)}>
            details
          </button>
          )
        </p>
        <p>Completed Analysis: {info.counts.completed}</p>
      </div>
      <Button className="mt-2" disabled={isLoading} size="xs" onClick={() => load(batchId)}>
        {isLoading ? "loading..." : "Refresh"}
      </Button>
      <Modal size="7xl" show={showDetails} onClose={() => setShowDetails(false)}>
        <Modal.Header>Unresolved URLs</Modal.Header>
        <Modal.Body>
          <DownloadedUrlDetails batchId={batchId} />
        </Modal.Body>
      </Modal>
    </div>
  )
}

function DownloadedUrlDetails({ batchId }: { batchId: string }) {
  const [isLoading, load, details] = useAction(getUnresolvedUrlInfo)
  useEffect(() => {
    load(batchId)
  }, [load, batchId])
  if (details == null || isLoading) {
    return "Loading..."
  }
  if (details.result === "error") {
    return <div>{details.error}</div>
  }
  return (
    <Table>
      <Table.Head>
        <Table.HeadCell>Item ID</Table.HeadCell>
        <Table.HeadCell>Status</Table.HeadCell>
        <Table.HeadCell>Attempts</Table.HeadCell>
        <Table.HeadCell>Url</Table.HeadCell>
        <Table.HeadCell>Reason</Table.HeadCell>
      </Table.Head>
      <Table.Body>
        {details.unresolvedItems.map((item) => (
          <Table.Row key={item.id} className="border-b border-b-slate-600">
            <Table.Cell>{item.id}</Table.Cell>
            <Table.Cell className={item.debugInfo.resolveStatus.status === "failed" ? "text-red-600" : ""}>
              {item.debugInfo.resolveStatus.status}
            </Table.Cell>
            <Table.Cell>{item.debugInfo.resolveStatus.attempts}</Table.Cell>
            <Table.Cell>
              <a className="underline" target="_blank" rel="noreferrer" href={item.postUrl}>
                {item.postUrl}
              </a>
            </Table.Cell>
            <Table.Cell>{item.debugInfo.resolveStatus.lastFailure}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  )
}

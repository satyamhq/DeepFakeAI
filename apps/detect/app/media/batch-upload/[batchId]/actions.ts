"use server"

import { resolveResponseSchema } from "@truemedia/clients/mediares"
import { db } from "../../../db"
import { allowedToBatchUpload } from "../actions"
import { DebugInfo, debugInfoSchema } from "../schedulerJobs"

export async function getUnresolvedUrlInfo(batchId: string) {
  if (!(await allowedToBatchUpload())) {
    return { result: "error" as const, error: "Not allowed." }
  }

  const unresolvedItems = await db.batchUploadItem.findMany({
    where: {
      batchUploadId: batchId,
      mediaId: null,
      resolveUrlJobId: { not: null },
    },
  })

  return {
    result: "success" as const,
    unresolvedItems: unresolvedItems.map((item) => {
      const parsedDebugInfo = debugInfoSchema.safeParse(item.debugInfo)
      let sanitizedDebugInfo: {
        resolveStatus: Pick<DebugInfo["resolveStatus"], "status" | "attempts"> & {
          lastFailure?: string
        }
      } = { resolveStatus: {} }
      if (parsedDebugInfo.success) {
        const { resolveStatus } = parsedDebugInfo.data
        sanitizedDebugInfo = {
          resolveStatus: {
            status: resolveStatus.status,
            attempts: resolveStatus.attempts,
          },
        }
        const parsedLastResponse = resolveResponseSchema.safeParse(resolveStatus.lastResponse)
        if (parsedLastResponse.success) {
          if (parsedLastResponse.data.result === "failure") {
            sanitizedDebugInfo.resolveStatus.lastFailure = parsedLastResponse.data.reason
          }
        } else {
          sanitizedDebugInfo.resolveStatus.lastFailure = "Failed to parse last response."
        }
      }

      return {
        id: item.id,
        postUrl: item.postUrl,
        resolveUrlJobId: item.resolveUrlJobId,
        debugInfo: sanitizedDebugInfo,
      }
    }),
  }
}

export async function getBatchInfo(batchId: string) {
  if (!(await allowedToBatchUpload())) {
    return { result: "error" as const, error: "Not allowed." }
  }

  const batchUpload = await db.batchUpload.findUnique({ where: { id: batchId } })
  if (!batchUpload) {
    return { result: "error" as const, error: "Batch not found." }
  }

  const counts = await db.batchUploadItem.count({
    where: {
      batchUploadId: batchId,
    },
    select: {
      _all: true,
      resolveUrlJobId: true,
      mediaId: true,
    },
  })

  const [result] = await db.$queryRaw<{ completed_items: bigint }[]>`
WITH resolved_items AS (
  SELECT
    *,
    (
      SELECT COUNT(*)
      FROM analysis_results ar
      WHERE ar.media_id = ui.media_id
    ) AS analysis_results_count,
    (
      SELECT COUNT(*)
      FROM analysis_results ar
      WHERE
        ar.media_id = ui.media_id
        AND ar.request_state IN ('COMPLETE', 'ERROR')
    ) AS completed_analysis_results_count
  FROM batch_upload_items ui
  WHERE
    batch_upload_id = ${batchId}
    AND start_analysis_job_id IS NOT NULL
    AND media_id IS NOT NULL
)
SELECT
  COUNT(1) as completed_items
FROM resolved_items ri
WHERE
  ri.analysis_results_count > 0
  AND ri.analysis_results_count = ri.completed_analysis_results_count
`

  return {
    result: "success" as const,
    counts: {
      total: counts._all,
      queued: counts.resolveUrlJobId,
      resolved: counts.mediaId,
      completed: Number(result.completed_items),
    },
    batchUpload: {
      createdAt: batchUpload?.createdAt.toISOString(),
    },
  }
}

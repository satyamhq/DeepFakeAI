"use server"

import { isStarterId } from "../../../api/starters/all"
import { startAnalysisJob } from "../../../api/start-analysis/actions"
import { db, getServerRole } from "../../../server"

type ErrorCase = { type: "error"; message: string }

export type ReevalResponse = ErrorCase | { type: "ready" }

export async function forceReeval(mediaId: string, source: string): Promise<ReevalResponse> {
  const role = await getServerRole()
  if (!role.internal) return { type: "error", message: "Not allowed." }
  if (!isStarterId(source)) return { type: "error", message: "Invalid source." }

  // delete the specific media+source analysis record
  await db.analysisResult.delete({ where: { mediaId_source: { mediaId, source } } })
  // and clear out the media's cached results json
  await db.media.update({ where: { id: mediaId }, data: { results: {} } })

  const userId = role.id
  await startAnalysisJob.schedule({
    priority: "live",
    json: {
      userId,
      mediaId,
      priority: "live",
      processorAllowlist: [source],
      includeIgnoredModels: true,
      apiAuthInfo: {
        success: true,
        authInfo: {
          userId,
          orgId: null,
          apiKeyId: null,
        },
      },
    },
  })

  return { type: "ready" }
}

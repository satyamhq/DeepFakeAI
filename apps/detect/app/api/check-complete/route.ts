import { Media, RequestState } from "@prisma/client"
import { db } from "../../server"
import { checkers } from "../starters/all"
import { mediaType } from "../../data/media"
import { response } from "../util"
import { checkResults, maybeUpdateResults } from "../get-results/actions"
import { processors } from "../../model-processors/all"
import { ApiAuthInfo } from "../apiKey"
import { isSchedulableProcessor } from "../../services/scheduler"

// Make sure Vercel doesn't cache the results of our cronjob, lol.
export const dynamic = "force-dynamic"

// Extend the max runtime for this script so that it can grind through a few reruns on each invocation.
export const maxDuration = 300

const PROCESSOR_TIMEOUT = 10 * 60 * 1000 // 10 minutes

async function failAsTimeout({
  media,
  source,
  requestState,
  apiAuthInfo,
}: {
  media: Media
  source: string
  requestState: RequestState | null
  apiAuthInfo: ApiAuthInfo
}) {
  const msg = `Processing timeout reached with requestState=${requestState}.`
  const now = new Date()
  await db.analysisResult.upsert({
    where: { mediaId_source: { mediaId: media.id, source } },
    create: {
      mediaId: media.id,
      source,
      json: JSON.stringify({ error: msg }),
      requestState: RequestState.ERROR,
      completed: now,
      apiKeyId: apiAuthInfo?.success ? apiAuthInfo.authInfo.apiKeyId : undefined,
    },
    update: {
      json: JSON.stringify({ error: msg }),
      requestState: RequestState.ERROR,
      completed: now,
    },
  })
}

export async function GET() {
  // TODO: set CRON_SECRET and check the Authorization header
  const apiAuthInfo: ApiAuthInfo = {
    success: false,
    publicReason: "No Authorization header provided.",
    privateReason: "The /api/check-complete endpoint does no authentication at all.",
  }

  const maybeDone: Media[] = []

  // check for analysis results in the PROCESSING or UPLOADING state (TODO: add an index on requestState column)
  const penders = await db.analysisResult.findMany({
    where: { OR: [{ requestState: RequestState.UPLOADING }, { requestState: RequestState.PROCESSING }] },
  })
  for (const pender of penders) {
    if (!pender.requestId) {
      console.warn("Pending analysis result missing request id? ", pender)
      continue
    }

    const media = await db.media.findUnique({ where: { id: pender.mediaId } })
    if (!media) {
      console.warn("Pending analysis result missing media? ", pender)
      continue
    }

    const processor = processors[pender.source]
    if (!processor) {
      console.warn("Pending analysis result missing processor? ", pender)
      continue
    }

    // Processors that are not handled by the scheduler may get stuck PROCESSING,
    // so we transition those to failures here after a timeout.
    if (!isSchedulableProcessor(processor.id)) {
      const now = new Date()
      const timeout = processor.timeoutMs || PROCESSOR_TIMEOUT
      const timeoutReached = now.getTime() - pender.created.getTime() > timeout
      if (timeoutReached) {
        await failAsTimeout({ media, source: pender.source, requestState: pender.requestState, apiAuthInfo })
        maybeDone.push(media)
        continue
      }
    }

    if (pender.requestState === RequestState.PROCESSING) {
      const checker = checkers[pender.source]
      if (!checker) continue

      // if the checker reports that this analysis is completed, make a note of the media
      const res = await checker(pender.requestId, mediaType(media.mimeType), media.id, apiAuthInfo)
      if (res) maybeDone.push(media)
    }
  }

  // any media that just completed a result needs to be processed further, to potentially finalize its cached results
  const finishers = maybeDone.map(async (mm) => {
    const analyses = await db.analysisResult.findMany({ where: { mediaId: mm.id } })
    await maybeUpdateResults(mm, await checkResults(mm, analyses, { includeIgnoredModels: true, apiAuthInfo }))
  })
  await Promise.all(finishers)

  return response.make(200, { penders: penders.length, finished: finishers.length })
}

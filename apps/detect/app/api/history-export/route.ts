import { createObjectCsvStringifier } from "csv-writer"
import { determineSourceAccount, mediaType, sourceLabels, typeLabels } from "../../data/media"
import { fakeLabels } from "../../data/groundTruth"
import { getServerRole } from "../../server"
import { UserQuery, getUserHistory } from "../../media/history/actions"
import { currentSiteBaseUrl } from "../../site"
import { computeVoteVerdict, verdicts } from "../../data/verdict"
import { manipulationModels, models } from "../../model-processors/all"
import { ManipulationCategory, manipulationCategoryInfo, ModelResult } from "../../data/model"
import { NextRequest } from "next/server"
import { searchParamToDate } from "../../utils/datetime"

export const dynamic = "force-dynamic"

// some arbitrarily large but not infinite number
const MAX_RESULTS = 10000

type CSVRecord = {
  postUrl: string
  mediaSource: string
  mediaAccount: string
  mediaTypeLabel: string
  analysisUrl: string
  verdictLabel: string
  groundTruth: string
  audioGroundTruth: string | null
  queriedAt: string
  analysisTime: string
  userEmail: string
} & CSVManipulationVerdicts

type CSVManipulationVerdicts = Partial<Record<ManipulationCategory, string>>

type Header = {
  id: keyof CSVRecord | ManipulationCategory
  title: string
}

// map from the object keys to what header titles should appear in the csv
// this also defines the order of the columns in the output
const HEADERS: Header[] = [
  { id: "postUrl", title: "Media Source URL" },
  { id: "mediaSource", title: "Media Platform" },
  { id: "mediaAccount", title: "Media Account" },
  { id: "verdictLabel", title: "Overall Label" },
  { id: "groundTruth", title: "Visual Human Analyst Label" },
  { id: "audioGroundTruth", title: "Audio Human Analyst Label" },
  { id: "mediaTypeLabel", title: "Media Type" },
  { id: "face", title: manipulationCategoryInfo.face.label },
  { id: "imagen", title: manipulationCategoryInfo.imagen.label },
  { id: "noise", title: manipulationCategoryInfo.noise.label },
  { id: "audio", title: manipulationCategoryInfo.audio.label },
  { id: "other", title: manipulationCategoryInfo.other.label },
  { id: "queriedAt", title: "Analyzed Date" },
  { id: "analysisTime", title: "Analysis Time(sec)" },
  { id: "analysisUrl", title: "TrueMedia URL" },
  { id: "userEmail", title: "Submitted by Email" },
]

function sortManipulationResults(results: ModelResult[]): Partial<Record<ManipulationCategory, ModelResult[]>> {
  const sorted: Partial<Record<ManipulationCategory, ModelResult[]>> = {}

  results
    .filter((res) => {
      const model = models[res.modelId]
      return model.type === "manipulation"
    })
    .forEach((res) => {
      const model = manipulationModels[res.modelId]
      if (!sorted[model.manipulationCategory]) {
        sorted[model.manipulationCategory] = []
      }
      sorted[model.manipulationCategory]?.push(res)
    })

  return sorted
}

function getCsv(historyItems: UserQuery[]): string {
  const records: CSVRecord[] = historyItems.map(
    ({
      postUrl,
      mediaId,
      mimeType,
      verdict,
      queriedAt: time,
      analysisTime,
      mediaSource,
      visualFake,
      audioFake,
      resolvedResults,
      userEmail,
    }) => {
      const type = mediaType(mimeType ?? "unknown")
      const mediaTypeLabel = typeLabels[type]
      const analysisUrl = mediaId ? "/media/analysis?id=" + mediaId : "/media/resolve?url=" + postUrl
      const verdictLabel = verdict === "unresolved" ? "Unresolved" : verdicts[verdict].shortSummary
      const mediaSourceLabel = sourceLabels[mediaSource]
      const mediaAccount = determineSourceAccount(postUrl) || "unknown"

      const sortedResults = sortManipulationResults(resolvedResults)
      const manipulationVerdicts: Partial<Record<ManipulationCategory, string>> = {}
      for (const category of Object.keys(manipulationCategoryInfo)) {
        const categoryResults = sortedResults[category as ManipulationCategory]
        if (categoryResults !== undefined) {
          manipulationVerdicts[category as ManipulationCategory] =
            verdicts[computeVoteVerdict(type, categoryResults)].shortSummary
        }
      }

      return {
        mediaSource: mediaSourceLabel,
        mediaAccount,
        postUrl,
        mediaTypeLabel,
        analysisUrl: currentSiteBaseUrl + analysisUrl,
        verdictLabel,
        groundTruth: fakeLabels[visualFake],
        audioGroundTruth: type === "video" ? fakeLabels[audioFake] : null,
        queriedAt: time?.toISOString() ?? "",
        analysisTime: analysisTime.toFixed(0),
        ...manipulationVerdicts,
        userEmail,
      }
    },
  )

  const csvWriter = createObjectCsvStringifier({
    header: HEADERS,
  })
  const csvString = csvWriter.getHeaderString() + csvWriter.stringifyRecords(records)
  return csvString
}

export async function GET(req: NextRequest): Promise<Response> {
  const role = await getServerRole()
  if (!role.user) return new Response("Must be logged in.", { status: 403 })

  const filter = req.nextUrl.searchParams.get("f") || "all"
  const query = req.nextUrl.searchParams.get("q") || ""
  const timeStart = searchParamToDate(req.nextUrl.searchParams.get("t0") || "")
  const timeEnd = searchParamToDate(req.nextUrl.searchParams.get("tf") || "")
  const userId = req.nextUrl.searchParams.get("userId") || null
  const orgId = req.nextUrl.searchParams.get("orgId") || null

  const allOrg = req.nextUrl.searchParams.get("allOrg") === "true"
  const isImpersonating = req.nextUrl.searchParams.get("isImpersonating") === "true"

  const { history } = await getUserHistory({
    take: MAX_RESULTS,
    filter,
    query,
    timeStart,
    timeEnd,
    sortOrder: "desc",
    userId,
    orgId,
    allOrg,
    isImpersonating,
  })
  const csvString = getCsv(history)
  const fileName = `truemedia-history-${new Date().toISOString()}.csv`

  return new Response(csvString, {
    status: 200,
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${fileName}"` },
  })
}

import { db } from "../../server"
import { pageNav } from "../ui"
import { DateRange, summarize } from "../summarize"
import { loadDatasets } from "../datasets/data"
import EvalPage from "./EvalPage"
import { datasetGroupDateRange } from "../datasets/util"

export const dynamic = "force-dynamic"

export default async function Page({ searchParams: query }: { searchParams: DateRange }) {
  if (Object.keys(query).length === 0) {
    const evalGroup = await db.datasetGroup.findUnique({ where: { name: "eval" } })
    if (evalGroup) query = datasetGroupDateRange(evalGroup)
  }
  const datasets = await loadDatasets()
  const media = await db.media.findMany({
    where: {
      // Only load media for which some ground truth is known. Media with no known ground truth will never be included
      // in the evaluation stats.
      meta: {
        OR: [{ fake: "TRUE" }, { fake: "FALSE" }, { audioFake: "TRUE" }, { audioFake: "FALSE" }],
      },
      resolvedAt: {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      },
    },
    include: { meta: true },
  })
  console.log(`Loaded ${media.length} media records.`)
  const msums = summarize(media)

  return (
    <>
      {pageNav("Eval")}
      <EvalPage datasets={datasets} msums={msums} query={query} />
    </>
  )
}

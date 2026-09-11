import { Dataset } from "@prisma/client"
import { db } from "../../server"
import { MediaType } from "../../data/media"
import { meansUnknown } from "../../data/groundTruth"
import { pageNav, table, showText, mkLink } from "../ui"
import { summarize } from "../summarize"
import { Filter } from "../filter"
import { AddDataset, EditDataset, AddDatasetGroup, DeleteItem, EditGroupDatasets, EditGroupDateRange } from "./ui"
import { datasetGroupEvalLink } from "./util"
import { loadDatasets, internalUserId } from "./data"

const countLabel = (label: string, count: number) =>
  count == 0 ? undefined : (
    <div>
      {label}: {count}
    </div>
  )

type CountMeta = Record<MediaType, number> & { unlabeled: number }

function DatasetRow({ dataset, counts }: { dataset: Dataset; counts: CountMeta }) {
  const isEditable = dataset.id !== internalUserId
  return (
    <div className="flex flex-col text-slate-400">
      <div className="flex flex-row gap-3">
        <div className="font-bold text-slate-200 w-96">{dataset.name}</div>
        {mkLink(`/internal/eval?ds=${dataset.id}`, "View Eval")}
        {countLabel("Video", counts.video)}
        {countLabel("Image", counts.image)}
        {countLabel("Audio", counts.audio)}
        <div className="grow" />
        {isEditable && <EditDataset dataset={dataset} />}
        {isEditable && <DeleteItem item={dataset} kind="dataset" />}
      </div>
      <div className="flex flex-row gap-3">
        <div className="w-96">Keywords: {dataset.keywords}</div>
        {countLabel("Unlabeled", counts.unlabeled)}
      </div>
      <div className="flex flex-row">Source: {dataset.source}</div>
    </div>
  )
}

const DisableCounts = true
export default async function Page() {
  const datasets = await loadDatasets()
  const groups = await db.datasetGroup.findMany()

  // Loading all of our tens of thousands of media records just to count up how many media items are in each dataset
  // has become prohibitively expensive. So we're disabling it. I'm leaving it here in case we want to move it to a
  // "give me the stats for this particular dataset" page or if maybe Prisma someday supports streaming results from
  // the database and processing them incrementally instead of loading the entire query results into a single giant
  // string and then parsing that.
  const counts = datasets.map(() => ({ image: 0, video: 0, audio: 0, unknown: 0, unlabeled: 0 }))
  if (!DisableCounts) {
    const media = await db.media.findMany({
      where: { meta: { isNot: null } },
      include: { meta: true },
    })
    console.log(`Loaded ${media.length} media records.`)

    const msums = summarize(media)
    datasets.forEach((ds, ii) => {
      const filter = Filter.make(ds.keywords)
      const dscounts = counts[ii]
      for (const ms of msums) {
        if (filter.matchesSummary(ms)) {
          if (meansUnknown(ms.fake)) dscounts.unlabeled += 1
          else dscounts[ms.type] += 1
        }
      }
    })
  }

  return (
    <>
      {pageNav("Data Catalog")}
      <div className="flex flex-col divide-y divide-slate-600">
        <h2 className="text-lg font-bold">Datasets</h2>
        {datasets.map((ds, ii) => (
          <DatasetRow key={ds.id} dataset={ds} counts={counts[ii]} />
        ))}
      </div>
      <div className="mt-5">
        <h2 className="text-lg font-bold">Add Dataset</h2>
        <AddDataset />
      </div>
      <div className="mt-5">
        <h2 className="text-lg font-bold">Dataset Groups</h2>
        {table(
          groups,
          (dg) => dg.id,
          ["Name", "Datasets", "Date range", ""],
          [
            (dg) => showText(dg.name),
            (dg) => <EditGroupDatasets group={dg} datasets={datasets} />,
            (dg) => <EditGroupDateRange group={dg} />,
            (dg) => <DeleteItem item={dg} kind="dataset group" />,
            (dg) => mkLink(datasetGroupEvalLink(dg), "Eval"),
          ],
        )}
      </div>
      <div className="mt-5">
        <h2 className="text-lg font-bold">Add Dataset Group</h2>
        <AddDatasetGroup />
      </div>
    </>
  )
}

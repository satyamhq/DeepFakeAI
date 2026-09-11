import { FiMeh, FiHelpCircle } from "react-icons/fi"
import { Tooltip } from "flowbite-react"
import { db } from "../../server"
import { table, showText, pageNav } from "../ui"
import DateLabel from "../../components/DateLabel"
import { Filter } from "../filter"
import { CreateRerun, DeleteRerun } from "./ui"

export const dynamic = "force-dynamic"

function formatDateRange(from: string | null, to: string | null): string {
  if (from && to) return `${from} to ${to}`
  else if (from) return `>= ${from}`
  else if (to) return `<= ${to}`
  else return ""
}

export default async function Page() {
  const reruns = await db.rerun.findMany({
    include: { creator: true },
    orderBy: [{ started: "desc" }],
  })

  const rerunTable = (header: string, completed: boolean) => (
    <div className="mt-5">
      <h2 className="text-lg">
        <b>{header}</b>
      </h2>
      {table(
        reruns.filter((rr) => !!rr.completed === completed),
        (rr) => rr.id,
        ["Info", "Source", "Filter", "Date Range", "Started", "Processed", "Completed", ""],
        [
          (rr) => (
            <div className="flex flex-row gap-1">
              <Tooltip content={`Rerun ID: ${rr.id}`} placement="right">
                <FiHelpCircle />
              </Tooltip>
              <Tooltip content={`Creator: ${rr.creator.email ?? rr.creatorId}`} placement="right">
                <FiMeh />
              </Tooltip>
            </div>
          ),
          (rr) => showText(rr.source),
          (rr) => (
            <span>
              {(rr.mediaId ? rr.mediaId : Filter.make(rr.keywords).explain()) + (rr.includeUnknown ? " +unknown" : "")}
            </span>
          ),
          (rr) => <span>{formatDateRange(rr.fromDate, rr.toDate)}</span>,
          (rr) => <DateLabel date={rr.started} />,
          (rr) => showText(`${rr.complete} of ${rr.matched}`),
          (rr) => (rr.completed ? <DateLabel date={rr.completed} /> : showText("(processing)")),
          (rr) => <DeleteRerun rerun={rr} />,
        ],
      )}
    </div>
  )

  return (
    <>
      {pageNav("Analysis Reruns")}

      <div>
        <h2 className="text-lg">
          <b>Start New Rerun</b>
        </h2>
        <CreateRerun />
      </div>

      {reruns.find((rr) => !rr.completed) && rerunTable("Active Reruns", false)}
      {rerunTable("Completed Reruns", true)}
    </>
  )
}

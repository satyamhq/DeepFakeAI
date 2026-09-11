import { DatasetGroup } from "@prisma/client"
import { DateRange, toYMD } from "../summarize"

export function datasetGroupDateRange(dg: DatasetGroup): DateRange {
  const from = dg.fromDate ? toYMD(dg.fromDate) : undefined
  const to = dg.toDate ? toYMD(dg.toDate) : undefined
  return { from, to }
}

export function datasetGroupEvalLink(dg: DatasetGroup) {
  const args = dg.setIds.map((id) => `ds=${id}`)
  if (dg.fromDate) args.push(`from=${toYMD(dg.fromDate)}`)
  if (dg.toDate) args.push(`from=${toYMD(dg.toDate)}`)
  return `/internal/eval?${args.join("&")}`
}

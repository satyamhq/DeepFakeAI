import { table, format } from "../ui"
import { Stats } from "../metrics"

const empty = <div></div>
const formatStat = (stats: Stats, getScore: (stats: Stats) => number) =>
  stats.total > 0 ? format.metric(getScore(stats)) : empty
const formatFail = (count: number) => (count == 0 ? format.good(count) : format.bad(count))

const headers = ["Type", "Count", "FP", "FN", "Accuracy", "F1", "Precision", "Recall", "TN%"]

export type StatsRow = { id: string; label: string; stats: Stats }

export default function StatsTable({ data, toggleExpand }: { data: StatsRow[]; toggleExpand: (id: string) => void }) {
  return table(data, (rr) => rr.id, headers, [
    (ww) =>
      ww.id === "unknown" ? (
        <div>{ww.label}</div>
      ) : (
        <div className="underline" onClick={() => toggleExpand(ww.id)}>
          {ww.label}
        </div>
      ),
    (ww) => <div>{ww.stats.total}</div>,
    (ww) => formatFail(ww.stats.falsePos),
    (ww) => formatFail(ww.stats.falseNeg),
    (ww) => formatStat(ww.stats, (ss) => ss.accuracy),
    (ww) => (ww.stats.total > 0 ? <div>{ww.stats.f1.toFixed(2)}</div> : empty),
    (ww) => formatStat(ww.stats, (ss) => ss.precision),
    (ww) => formatStat(ww.stats, (ss) => ss.recall),
    (ww) => formatStat(ww.stats, (ss) => ss.negAcc),
  ])
}

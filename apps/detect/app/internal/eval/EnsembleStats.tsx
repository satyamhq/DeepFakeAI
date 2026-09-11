import { Tooltip } from "flowbite-react"
import { format } from "../ui"
import { Stats } from "../metrics"

const headerLabel = (label: string, tip: string, placement: "top" | "right" = "top") => (
  <Tooltip content={tip} style="light" placement={placement}>
    <div>{label}</div>
  </Tooltip>
)

export default function EnsembleStats({ stats, compare }: { stats: Stats; compare?: Stats }) {
  return (
    <>
      <div className="grid grid-cols-[3fr_1fr_1fr_1fr]">
        <div></div>
        {headerLabel("Red", "Ensemble algorithm classifies as fake.")}
        {headerLabel("Green", "Ensemble algorithm classifies as real.")}
        <div>Total</div>

        <div>{format.fake("Fakes:")}</div>
        <div>{format.good(stats.truePos)}</div>
        <div>{format.bad(stats.falseNeg)}</div>
        <div>{format.fake(stats.truePos + stats.falseNeg)}</div>

        <div>{format.real("Reals:")}</div>
        <div>{format.bad(stats.falsePos)}</div>
        <div>{format.good(stats.trueNeg)}</div>
        <div>{format.real(stats.trueNeg + stats.falsePos)}</div>
      </div>

      <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] mt-3">
        {headerLabel("Accuracy", "(correct reds + correct greens) / (total reds + total greens)", "right")}
        {headerLabel("F1", "Harmonic average of precision and recall.")}
        {headerLabel("Precision", "correct reds / total reds")}
        {headerLabel("Recall", "correct reds / total fakes")}
        {headerLabel("False Pos %", "incorrect reds / total reals")}
        {format.metric(stats.accuracy, compare?.accuracy)}
        {format.metric(stats.f1, compare?.f1)}
        {format.metric(stats.precision, compare?.precision)}
        {format.metric(stats.recall, compare?.recall)}
        {format.metric(1 - stats.negAcc, compare ? 1 - compare.negAcc : undefined, false)}
      </div>
    </>
  )
}

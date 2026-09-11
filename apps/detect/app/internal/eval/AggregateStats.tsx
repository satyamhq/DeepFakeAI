import { Tooltip } from "flowbite-react"
import { format } from "../ui"
import { AggStats } from "../metrics"

const headerLabel = (label: string, tip: string, placement: "top" | "right" = "top") => (
  <Tooltip content={tip} style="light" placement={placement}>
    <div>{label}</div>
  </Tooltip>
)

type Algorithm = "vote" | "ensemble"

export default function AggregateStats({ algo, agg, compare }: { algo: Algorithm; agg: AggStats; compare?: AggStats }) {
  const tips =
    algo == "vote"
      ? {
          red: "One trusted or two+ untrusted models report fake.",
          yellow: "Only one untrusted model reports fake.",
          green: "Zero models report fake.",
        }
      : {
          red: "Ensemble score >= 0.8.",
          yellow: "Ensemble score between 0.2 and 0.8.",
          green: "Ensemble score <= 0.2.",
        }
  return (
    <>
      <div className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr]">
        <div></div>
        {headerLabel("Red", tips.red)}
        {headerLabel("Yellow", tips.yellow)}
        {headerLabel("Green", tips.green)}
        <div>Total</div>

        <div>{format.fake("Fakes:")}</div>
        <div>{format.good(agg.truePos)}</div>
        <div>{format.indet(agg.indetFake)}</div>
        <div>{format.bad(agg.falseNeg)}</div>
        <div>{format.fake(agg.truePos + agg.falseNeg + agg.indetFake)}</div>

        <div>{format.real("Reals:")}</div>
        <div>{format.bad(agg.falsePos)}</div>
        <div>{format.indet(agg.indetReal)}</div>
        <div>{format.good(agg.trueNeg)}</div>
        <div>{format.real(agg.trueNeg + agg.falsePos + agg.indetReal)}</div>
      </div>

      <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] mt-3">
        {headerLabel("Accuracy", "(correct reds + correct greens) / (total reds + total greens)", "right")}
        {headerLabel("F1", "Harmonic average of precision and recall.")}
        {headerLabel("Precision", "correct reds / total reds")}
        {headerLabel("Recall", "correct reds / total fakes")}
        {headerLabel("False Pos %", "incorrect reds / total reals")}
        {format.metric(agg.accuracy, compare?.accuracy)}
        {format.metric(agg.f1, compare?.f1)}
        {format.metric(agg.precision, compare?.precision)}
        {format.metric(agg.recall, compare?.recall)}
        {format.metric(agg.falsePosRate, compare?.falsePosRate, false)}
      </div>
    </>
  )
}

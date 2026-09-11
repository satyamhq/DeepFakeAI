import { ExperimentalReason, VerdictResult, verdicts } from "../../data/verdict"

const experimentalToDescription: Record<ExperimentalReason, string> = {
  "faces-too-many": "it contains too many faces",
  "faces-too-few": "our computer vision models didn't identify any faces (possibly due to framing or resolution)",
  artwork: "it contains artwork",
  text: "it contains large amounts of text",
}

/* Map the list of categories 🐱 into a comma separated UI description */
export const getExperimentalDescription = (categories: ExperimentalReason[]) => {
  const cats = categories.map((category) => experimentalToDescription[category])
  if (cats.length === 0) return ""
  else if (cats.length === 1) return cats[0]
  else if (cats.length === 2) return `${cats[0]} and ${cats[1]}`
  else {
    return cats.reduce(
      (result, cat, index) => {
        if (index === cats.length - 1) return result // the last one is already accounted for below
        return `${cat}, ${result}`
      },
      `and ${cats[cats.length - 1]}`,
    )
  }
}

const ExperimentalDescription = ({ verdictResult }: { verdictResult: VerdictResult }) => {
  const { experimentalReasons } = verdictResult
  const experimentalDescription = getExperimentalDescription(experimentalReasons)

  return experimentalDescription ? (
    <div>
      TrueMedia.org labels this <b>uncertain</b> because {experimentalDescription}, which{" "}
      {experimentalReasons.length > 1 ? "are" : "is"} outside our focus.
    </div>
  ) : (
    <div>
      TrueMedia.org labels this <b>uncertain</b> because it is outside our focus on political deepfakes.
    </div>
  )
}

export default function VerdictDescription({ verdictResult }: { verdictResult: VerdictResult }) {
  const { verdict, experimentalReasons } = verdictResult
  if (experimentalReasons.length > 0) {
    return <ExperimentalDescription verdictResult={verdictResult} />
  }

  return (
    <div>
      TrueMedia.org verdict: <b>{verdicts[verdict].adjective} evidence</b> of manipulation.
    </div>
  )
}

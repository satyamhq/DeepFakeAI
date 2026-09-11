"use client"

import Link from "next/link"
import { ClockIcon } from "../../components/icons"
import { useRouter } from "next/navigation"
import { Select } from "flowbite-react"

function displayValue(value: number) {
  if (isNaN(value)) {
    return 1
  }
  return value.toFixed(2)
}

export default function PrecisionRecallF1({
  as,
  allOrg,
  selectedAccuracy = "all",
  tallyScores,
}: {
  as: string | null
  allOrg: boolean
  selectedAccuracy?: string
  tallyScores: Record<string, number> | undefined
}) {
  const router = useRouter()
  if (!as) return null
  if (!tallyScores || tallyScores.totalGroundTruths === 0) {
    return (
      <div className="mb-4">
        <div className="font-bold text-xl my-5">Performance</div>
        <div>No data.</div>
      </div>
    )
  }

  const groundTruthUrl = `/media/history?as=${as}${allOrg ? "&allOrg=true" : ""}`

  const precision = tallyScores.truePositives / (tallyScores.truePositives + tallyScores.falsePositives)
  const recall = tallyScores.truePositives / (tallyScores.truePositives + tallyScores.falseNegatives)
  const f1 = (2 * (precision * recall)) / (precision + recall)

  const go = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target
    if (value === "all") {
      router.push(groundTruthUrl)
    } else {
      router.push(groundTruthUrl + "&acc=" + value)
    }
  }

  return (
    <div className="mb-4">
      <div className="font-bold text-xl my-5">
        Performance Filter
        <Select onChange={go} value={selectedAccuracy}>
          <option value="all" selected={selectedAccuracy === "all"}>
            All
          </option>
          <option value="true-positives" selected={selectedAccuracy === "true-positives"}>
            True Positives
          </option>
          <option value="false-positives" selected={selectedAccuracy === "false-positives"}>
            False Positives
          </option>
          <option value="false-negatives" selected={selectedAccuracy === "false-negatives"}>
            False Negatives
          </option>
          <option value="true-negatives" selected={selectedAccuracy === "true-negatives"}>
            True Negatives
          </option>
        </Select>
      </div>
      <div className="flex flex-col lg:flex-row gap-2">
        <table className="table-auto border border-collapse border-slate-500 bg-slate-800">
          <thead>
            <tr>
              <th className="border border-slate-600 p-2 text-slate-200 text-left">Positive = Fake</th>
              <th className="border border-slate-600 p-2 text-slate-200 text-left">True Positive</th>
              <th className="border border-slate-600 p-2 text-slate-200 text-left">True Negative</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-700 p-2 text-slate-400">
                <span className="text-white font-bold">Predicted Positive</span>
              </td>
              <td className="border border-slate-700 p-2 text-slate-400 text-center">
                <span className="m-auto text-green-500">
                  <Link href={`${groundTruthUrl}&acc=true-positives`}>
                    <span className="mr-1">TP={tallyScores.truePositives}</span>
                    <ClockIcon />
                  </Link>
                </span>
              </td>
              <td className="border border-slate-700 p-2 text-slate-400 text-center">
                <span className="m-auto text-red-500">
                  <Link href={`${groundTruthUrl}&acc=false-positives`}>
                    <span className="mr-1">FP={tallyScores.falsePositives}</span>
                    <ClockIcon />
                  </Link>
                </span>
              </td>
            </tr>
            <tr>
              <td className="border border-slate-700 p-2 text-slate-400">
                <span className="text-white font-bold">Predicted Negative</span>
              </td>
              <td className="border border-slate-700 p-2 text-slate-400 text-center">
                <span className="m-auto text-red-500">
                  <Link href={`${groundTruthUrl}&acc=false-negatives`}>
                    <span className="mr-1">FN={tallyScores.falseNegatives}</span>
                    <ClockIcon />
                  </Link>
                </span>
              </td>
              <td className="border border-slate-700 p-2 text-slate-400 text-center">
                <span className="m-auto text-green-500">
                  <Link href={`${groundTruthUrl}&acc=true-negatives`}>
                    <span className="mr-1">TN={tallyScores.trueNegatives}</span>
                    <ClockIcon />
                  </Link>
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <div>
          <table className="table-auto w-full border border-collapse border-slate-500 bg-slate-800">
            <tbody>
              <tr>
                <td className="text-right border border-slate-700 p-2 text-slate-400">
                  <span className="text-white font-bold">Total Ground Truth</span>
                </td>
                <td className="border border-slate-700 p-2 text-slate-400">
                  <Link href={`${groundTruthUrl}&acc=all-ground-truth`}>
                    <span className="mr-1">{tallyScores.totalGroundTruths}</span>
                    <ClockIcon />
                  </Link>
                </td>
              </tr>
              <tr>
                <td className="text-right border border-slate-700 p-2 text-slate-400">
                  <span className="text-white font-bold">Precision</span>
                </td>
                <td className="border border-slate-700 p-2 text-slate-400">
                  <span>{displayValue(precision)}</span>
                </td>
              </tr>
              <tr>
                <td className="text-right border border-slate-700 p-2 text-slate-400">
                  <span className="text-white font-bold">Recall</span>
                </td>
                <td className="border border-slate-700 p-2 text-slate-400">
                  <span>{displayValue(recall)}</span>
                </td>
              </tr>
              <tr>
                <td className="text-right border border-slate-700 p-2 text-slate-400">
                  <span className="text-white font-bold">F1</span>
                </td>
                <td className="border border-slate-700 p-2 text-slate-400">
                  <span>{displayValue(f1)}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

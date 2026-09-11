import { FaRegCheckCircle } from "react-icons/fa"
import { FaRegCircleXmark } from "react-icons/fa6"
import { FiMinusCircle } from "react-icons/fi"

export enum EvidenceLevel {
  high = "high",
  uncertain = "uncertain",
  low = "low",
}

export function SubstantialEvidence() {
  return (
    <span className="bg-red-900 text-red-300 text-sm rounded p-1 px-2">
      <FaRegCircleXmark className="inline mr-2 mb-1" />
      Substantial Evidence
    </span>
  )
}

export function Uncertain() {
  return (
    <span className="bg-yellow-900 text-yellow-300 text-sm rounded p-1 px-2">
      <FiMinusCircle className="inline mr-2 mb-1" />
      Uncertain
    </span>
  )
}

export function LittleEvidence() {
  return (
    <span className="bg-green-900 text-green-300 text-sm rounded p-1 px-2">
      <FaRegCheckCircle className="inline mr-2 mb-1" />
      Little Evidence
    </span>
  )
}

export const misleadingLabel = "Misleading Content"
export const misleadingBackgroundColor = "bg-red-900"
export const misleadingTextColor = "text-red-300"
export function Misleading() {
  return (
    <span className={`${misleadingBackgroundColor} ${misleadingTextColor} text-sm rounded p-1 px-2`}>
      <FaRegCircleXmark className="inline mr-2 mb-1" />
      {misleadingLabel}
    </span>
  )
}

export function InProgress() {
  return <span className="bg-gray-900 text-gray-300 text-sm rounded p-1 px-2">In Progress</span>
}

export function Unresolved() {
  return <span className="bg-gray-900 text-gray-300 text-sm rounded p-1 px-2">Unresolved</span>
}

export function EvidenceLabel({ verdict }: { verdict: string }) {
  return verdict === "high" ? (
    <SubstantialEvidence />
  ) : verdict === "uncertain" ? (
    <Uncertain />
  ) : verdict === "trusted" || verdict === "low" ? (
    <LittleEvidence />
  ) : verdict === "unresolved" ? (
    <Unresolved />
  ) : (
    <InProgress />
  )
}

import { Dispatch, SetStateAction } from "react"
import { Select } from "flowbite-react"
import { MediaSource, sourceLabels } from "../../data/media"

export default function PickSource({
  source,
  setSource,
}: {
  source: MediaSource | undefined
  setSource: Dispatch<SetStateAction<MediaSource | undefined>>
}) {
  const update = (source: string) => setSource(source ? (source as MediaSource) : undefined)
  return (
    <div className="flex flex-col gap-1">
      <div className="text-gray-400">Source:</div>
      <Select value={source ?? ""} onChange={(e) => update(e.target.value)}>
        <option key="" value="">
          Any
        </option>
        {Object.keys(sourceLabels).map((source) => (
          <option key={source} value={source}>
            {sourceLabels[source as MediaSource]}
          </option>
        ))}
      </Select>
    </div>
  )
}

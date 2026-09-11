import { Dispatch, SetStateAction, useState } from "react"
import { TextInput } from "flowbite-react"
import { AiOutlineCloseCircle } from "react-icons/ai"
import { Filter } from "../filter"
import FilterHelp from "./FilterHelp"

export default function EditFilter({
  filter,
  setFilter,
  orient,
}: {
  filter: Filter
  setFilter: Dispatch<SetStateAction<Filter>>
  orient?: "horizontal" | "vertical"
}) {
  const [newFilter, setNewFilter] = useState("")

  const updateFilter = () => setFilter(Filter.make(newFilter))
  const clearFilter = () => setFilter(Filter.make(""))

  const onPressed = (key: string) => {
    if (key == "Enter") updateFilter()
  }
  const onClear = () => {
    clearFilter()
    setNewFilter("")
  }

  const orientStyle = orient == "horizontal" ? "flex flex-row gap-5" : "flex flex-col gap-1"
  return (
    <div className={orientStyle}>
      <div className="flex flex-row items-center gap-2">
        <span className="text-gray-400">Filter:</span>
        <b>{filter.explain()}</b>
        <AiOutlineCloseCircle className="cursor-pointer" onClick={onClear} />
      </div>
      <div className="flex flex-row items-center gap-2">
        <TextInput
          id="filter"
          placeholder="Update filter"
          value={newFilter}
          onKeyDown={(e) => onPressed(e.key)}
          onChange={(e) => setNewFilter(e.target.value.toLowerCase())}
        />
        <FilterHelp />
      </div>
    </div>
  )
}

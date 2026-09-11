"use client"

import { useSearchParams } from "next/navigation"
import { FaRegSquare, FaRegCheckSquare } from "react-icons/fa"
import { Dataset } from "@prisma/client"
import { Dropdown } from "flowbite-react"
import useUpdateSearchParams from "./useUpdateSearchParams"

export default function PickDatasets({ datasets }: { datasets: Dataset[] }) {
  const params = useSearchParams()
  const active = params.getAll("ds")

  const updateSearchParams = useUpdateSearchParams()

  function datasetItem(ds: Dataset) {
    const isOn = active.includes(ds.id)
    function updateUrl() {
      updateSearchParams((newParams) => {
        if (isOn) newParams.delete("ds", ds.id)
        else newParams.append("ds", ds.id)
      })
    }
    return (
      <Dropdown.Item key={ds.id} onClick={() => updateUrl()}>
        {isOn ? <FaRegCheckSquare /> : <FaRegSquare />} &nbsp; {ds.name}
      </Dropdown.Item>
    )
  }

  const dsname = (id: string) => datasets.find((ds) => ds.id == id)?.name ?? "<unknown>"
  return (
    <div className="flex flex-col gap-1">
      <div className="text-gray-400">Dataset:</div>
      <div className="flex flex-row gap-4 items-center">
        <Dropdown label={`${active.length} selected`} placement="right-start">
          {datasets.map(datasetItem)}
        </Dropdown>
        <div className="flex flex-row gap-2 items-center">
          {active.map((id) => (
            <span key={id}>{dsname(id)}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

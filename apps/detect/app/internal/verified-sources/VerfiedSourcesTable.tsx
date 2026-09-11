"use client"

import { VerifiedSource } from "@prisma/client"
import { showText, table } from "../ui"
import { FaEdit, FaRegTrashAlt } from "react-icons/fa"
import { deleteVerifiedSource, updateVerifiedSource } from "./manage/actions"
import { useState } from "react"
import { Button, TextInput } from "flowbite-react"
import OptionalTooltip from "../../components/OptionalTooltip"

export default function VerifiedSourcesTables({
  verifiedSources,
  canEdit,
}: {
  verifiedSources: VerifiedSource[]
  canEdit: boolean
}) {
  const [sources, setSources] = useState(verifiedSources)
  const [filter, setFilter] = useState("")

  const handleFilter = (ev: React.FormEvent<HTMLInputElement>) => {
    const newFilter = ev.currentTarget.value
    setFilter(newFilter)
    setSources(verifiedSources.filter((ss) => ss.displayName?.includes(newFilter) || ss.platformId.includes(newFilter)))
  }

  function EditDisplayName({ source }: { source: VerifiedSource }) {
    const [saving, setSaving] = useState("idle")
    const [error, setError] = useState("")
    const [isEditing, setIsEditing] = useState(false)
    const [displayName, setDisplayName] = useState(source.displayName ?? "")

    async function handleSubmit(ev: React.FormEvent<HTMLFormElement>) {
      ev.preventDefault()
      setSaving("saving")
      setError("")
      const updated = await updateVerifiedSource({ ...source, displayName })
      if (updated.error) {
        setSaving("error")
        setError(updated.error)
      } else if (updated.updated) {
        setSaving("idle")
        setIsEditing(false)
        setSources(sources.map((ss) => (ss.id === source.id ? updated.updated : ss)))
      }
    }

    if (isEditing) {
      return (
        <>
          <form onSubmit={handleSubmit} className="flex">
            <TextInput
              className="flex-grow"
              onChange={(ev) => setDisplayName(ev.target.value)}
              value={displayName}
              disabled={saving === "saving"}
            />
            <Button
              onClick={() => setIsEditing(false)}
              className="inline text-black"
              size="xs"
              color="gray"
              disabled={saving === "saving"}
            >
              Cancel
            </Button>
            <Button className="inline text-black" size="xs" color="lime" type="submit" disabled={saving === "saving"}>
              Save
            </Button>
          </form>
          {saving === "error" && <p>{error}</p>}
        </>
      )
    }
    return (
      <span className="flex justify-between">
        {source.displayName}
        <FaEdit className="cursor-pointer" onClick={() => setIsEditing(!isEditing)} />
      </span>
    )
  }

  function DeleteVerifiedSourceButton({ source }: { source: VerifiedSource }) {
    const [saving, setSaving] = useState("idle")
    const [error, setError] = useState({ id: "", error: "" })
    async function handleDelete(id: string) {
      setSaving("saving")
      const deleted = await deleteVerifiedSource(id)
      if (deleted.error) {
        setSaving("error")
        setError({ id, error: deleted.error })
      } else {
        setSaving("idle")
        setSources(sources.filter((source) => source.id !== id))
      }
    }

    const isDisabled = !canEdit

    let tooltipContent = null
    if (isDisabled) tooltipContent = "Your role does not support this action"
    else if (saving === "saving") tooltipContent = "Deleting..."
    else if (saving === "error") tooltipContent = error.error

    return (
      <OptionalTooltip placement="left" content={tooltipContent}>
        <button onClick={() => handleDelete(source.id)} disabled={isDisabled}>
          <FaRegTrashAlt />
        </button>
      </OptionalTooltip>
    )
  }

  return (
    <div>
      <div className="mb-2">
        Filter: <TextInput onChange={handleFilter} value={filter} />
      </div>
      {table(
        sources,
        (source) => source.id,
        ["Platform", "Platform Id", "Display Name", "Delete"],
        [
          (source) => showText(source.platform),
          (source) => showText(source.platformId ?? ""),
          (source) => <EditDisplayName source={source} />,
          (source) => (
            <span className="flex justify-center">
              <DeleteVerifiedSourceButton source={source} />
            </span>
          ),
        ],
      )}
    </div>
  )
}

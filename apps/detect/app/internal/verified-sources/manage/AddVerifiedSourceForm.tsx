"use client"

import { Button, Select } from "flowbite-react"
import { MediaPublisher, VerifiedSource } from "@prisma/client"
import { createVerifiedSource } from "./actions"
import { useState } from "react"

export const dynamic = "force-dynamic"

export default function AddVerifiedSourceForm() {
  const [saving, setSaving] = useState("editing")
  const [saved, setSaved] = useState<VerifiedSource | null>(null)
  const [updated, setUpdated] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    setSaving("saving")
    setErrorMessage("")
    const form = new FormData(ev.currentTarget)
    const platform = (form.get("platform") ?? MediaPublisher.UNKNOWN) as MediaPublisher
    const displayName = (form.get("displayName") as string) ?? ""
    const platformId = (form.get("platformId") as string) ?? ""
    const created = await createVerifiedSource(platform as MediaPublisher, displayName, platformId)
    if (created.error) {
      setSaving("error")
      setErrorMessage(created.error)
    } else if (created.saved && created.count) {
      setSaving("saved")
      setSaved(created.saved)
      setUpdated(created.count)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Select required name="platform">
        {Object.keys(MediaPublisher).map((publisher) => (
          <option key={publisher} value={publisher}>
            {publisher}
          </option>
        ))}
      </Select>
      Platform Id: <input required className="text-black" name="platformId" disabled={saving === "saving"} />
      Display Name: <input className="text-black" name="displayName" disabled={saving === "saving"} />
      <Button color="lime" type="submit" disabled={saving === "saving"}>
        Add Verified Source
      </Button>
      {saving === "saved" && saved && (
        <span className="text-yellow-200">
          Saved {saved.platformId} on {saved.platform}. Updated {updated} medias from the source.
        </span>
      )}
      {saving === "error" && saved && <span className="text-red-500">{errorMessage}</span>}
    </form>
  )
}

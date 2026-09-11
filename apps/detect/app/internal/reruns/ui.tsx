"use client"

import { Rerun } from "@prisma/client"
import { useState, useRef } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { Button, Checkbox, Label, TextInput, Select, Modal } from "flowbite-react"
import { processors } from "../../model-processors/all"
import { DateRange } from "../summarize"
import DateLabel from "../../components/DateLabel"
import FilterHelp from "../components/FilterHelp"
import PickDateRange from "../components/PickDateRange"
import { createRerun, deleteRerun } from "./actions"
import { isArchived } from "../../data/model"

export function CreateRerun() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const { pending } = useFormStatus()
  const [dateRange, setDateRange] = useState<DateRange>({})
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  async function onSubmit(data: FormData) {
    // Clear out any previous errors.
    setError("")

    const source = (data.get("source") as string) ?? ""
    const keywords = ((data.get("keywords") as string) ?? "").trim()
    const mediaId = ((data.get("media-id") as string) ?? "").trim()
    const includeUnknown = ((data.get("unknown") as string) ?? "").trim() != ""
    const onlyErrors = ((data.get("onlyErrors") as string) ?? "").trim() != ""
    const leewayDays = parseInt(((data.get("leeway") as string) ?? "").trim())

    if (keywords && mediaId) {
      setError("Error: if you enter a media ID do not also enter keywords. Rerun not started.")
      return
    }

    formRef.current?.reset()
    setMessage("Creating rerun...")
    const rsp = await createRerun({ source, keywords, mediaId, dateRange, includeUnknown, onlyErrors, leewayDays })
    switch (rsp.type) {
      case "error":
        setError(rsp.message)
        break
      case "created":
        setMessage(`Rerun created, id: ${rsp.id}, matched: ${rsp.matched}, incomplete: ${rsp.incomplete}`)
        router.refresh()
        break
    }
  }

  return (
    <form ref={formRef} action={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_4fr] gap-2 items-center mr-auto">
        <Label htmlFor="source">Source:</Label>
        <div className="flex flex-row gap-1 items-center">
          <Select name="source">
            {Object.keys(processors)
              .filter((procId) => !isArchived(processors[procId]))
              .sort()
              .map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
          </Select>
        </div>
        <Label htmlFor="keywords">Filter By:</Label>
        <div className="flex flex-row gap-1 items-center">
          <TextInput className="w-64" name="keywords" placeholder="keywords" />
          <FilterHelp />
          OR <TextInput className="w-64 ml-1" name="media-id" placeholder="enter 1 media id" />
        </div>
        <Label htmlFor="range">Date range:</Label>
        <PickDateRange range={dateRange} setRange={setDateRange} title={""} />
        <Label htmlFor="unknown">Include Unknown:</Label>
        <div className="flex flex-row gap-3 items-center">
          <Checkbox name="unknown" />
          <div className="text-sm text-gray-400">Whether or not to reprocess media with unknown ground truth.</div>
        </div>
        <Label htmlFor="onlyErrors">Only Rerun Errors:</Label>
        <div className="flex flex-row gap-3 items-center">
          <Checkbox name="onlyErrors" />
          <div className="text-sm text-gray-400">
            Only rerun items that have errors (remember, some errors can’t be fixed)
          </div>
        </div>
        <Label htmlFor="leeway">Leeway Days:</Label>
        <div className="flex flex-row gap-3 items-center mb-1">
          <TextInput name="leeway" type="number" min="0" className="w-12" defaultValue="0" />
          <div className="text-sm text-gray-400">
            Media already processed up to this many days ago will not be reprocessed.
          </div>
        </div>
        <div />
        <div className="flex flex-row gap-1 items-center">
          <Button type="submit" disabled={pending}>
            Start Rerun
          </Button>
        </div>
      </div>
      {message && <div className="p-2">{message}</div>}
      {error && <div className="p-2 text-red-500">{error}</div>}
    </form>
  )
}

export function DeleteRerun({ rerun }: { rerun: Rerun }) {
  const router = useRouter()
  const { pending } = useFormStatus()
  const [showConfirm, setShowConfirm] = useState(false)

  async function onSubmit() {
    await deleteRerun(rerun.id)
    setShowConfirm(false)
    router.refresh()
  }
  return (
    <form action={onSubmit}>
      <Button size="xs" onClick={() => setShowConfirm(true)}>
        Delete
      </Button>
      <Modal show={showConfirm} onClose={() => setShowConfirm(false)}>
        <Modal.Header>
          Delete Rerun of <b>{rerun.source}</b> analyses?
        </Modal.Header>
        <Modal.Body>
          <div>Id: {rerun.id}</div>
          <div>
            Started: <DateLabel date={rerun.started} />
          </div>
          <div>
            Completed: {rerun.complete} of {rerun.matched}
          </div>
          <div className="mt-3">No further media will be reanalyzed for this rerun.</div>
        </Modal.Body>
        <Modal.Footer className="justify-end">
          <form action={onSubmit}>
            <Button type="submit" disabled={pending}>
              Delete!
            </Button>
          </form>
          <Button color="gray" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </form>
  )
}

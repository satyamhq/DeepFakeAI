"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useFormStatus } from "react-dom"
import { Button, Dropdown, Label, Modal, TextInput } from "flowbite-react"
import { FaRegSquare, FaRegCheckSquare } from "react-icons/fa"
import { Dataset, DatasetGroup } from "@prisma/client"
import { DateRange, toYMD } from "../summarize"
import FilterHelp from "../components/FilterHelp"
import PickDateRange from "../components/PickDateRange"
import { storeDataset, createDatasetGroup, updateDatasetGroup, deleteItem } from "./actions"

export function AddDataset() {
  const router = useRouter()
  const { pending } = useFormStatus()
  const [name, setName] = useState("")
  const [source, setSource] = useState("")
  const [keywords, setKeywords] = useState("")
  const [message, setMessage] = useState("")

  async function onSubmit(data: FormData) {
    const name = (data.get("name") as string) ?? ""
    const source = ((data.get("source") as string) ?? "").trim()
    const keywords = ((data.get("keywords") as string) ?? "").trim()

    setMessage("Adding dataset...")
    const rsp = await storeDataset({ id: "", name, source, keywords })
    switch (rsp.type) {
      case "error":
        setMessage(rsp.message)
        break
      case "stored":
        setMessage("Dataset added.")
        setName("")
        setSource("")
        setKeywords("")
        router.refresh()
        break
    }
  }

  const missingData = !name.trim() || !source.trim() || !keywords.trim()
  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-row gap-4 items-center">
        <TextInput
          name="name"
          placeholder="source-monthyear-type"
          value={name}
          onChange={(e) => setName(e.target.value.toLowerCase())}
        />
        <TextInput name="source" placeholder="Source" value={source} onChange={(e) => setSource(e.target.value)} />
        <div className="flex flex-row gap-1 items-center">
          <TextInput
            name="keywords"
            placeholder="Filter keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value.toLowerCase())}
          />
          <FilterHelp />
        </div>
        <Button type="submit" disabled={pending || missingData}>
          Add
        </Button>
      </div>
      {message ? <div className="p-2">{message}</div> : undefined}
    </form>
  )
}

export function AddDatasetGroup() {
  const router = useRouter()
  const { pending } = useFormStatus()
  const [name, setName] = useState("")
  const [message, setMessage] = useState("")

  async function onSubmit(data: FormData) {
    const name = (data.get("name") as string) ?? ""

    setMessage("Adding dataset...")
    const rsp = await createDatasetGroup(name)
    switch (rsp.type) {
      case "error":
        setMessage(rsp.message)
        break
      case "created":
        setMessage("Dataset group added.")
        setName("")
        router.refresh()
        break
    }
  }

  const missingData = !name.trim()
  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-row gap-4 items-center">
        <TextInput
          name="name"
          placeholder="name"
          value={name}
          onChange={(e) => setName(e.target.value.toLowerCase())}
        />
        <Button type="submit" disabled={pending || missingData}>
          Add
        </Button>
      </div>
      {message ? <div className="p-2">{message}</div> : undefined}
    </form>
  )
}

export function EditDataset({ dataset }: { dataset: Dataset }) {
  const router = useRouter()
  const { pending } = useFormStatus()
  const [show, setShow] = useState(false)
  const [needRefresh, setNeedRefresh] = useState(false)
  const [message, setMessage] = useState("")
  const [name, setName] = useState(dataset.name)
  const [source, setSource] = useState(dataset.source)
  const [keywords, setKeywords] = useState(dataset.keywords)

  async function formAction() {
    setMessage("Updating dataset...")
    const rsp = await storeDataset({ id: dataset.id, name, source, keywords })
    switch (rsp.type) {
      case "error":
        setMessage(rsp.message)
        break
      case "stored":
        setMessage("Dataset updated.")
        dataset.name = name
        dataset.source = source
        dataset.keywords = keywords
        setNeedRefresh(true)
        break
    }
  }

  function close() {
    if (needRefresh) router.refresh()
    setShow(false)
  }

  const changed = name != dataset.name || source != dataset.source || keywords != dataset.keywords
  return (
    <>
      <span className="underline" onClick={() => setShow(true)}>
        Edit
      </span>
      <Modal show={show} onClose={close}>
        <Modal.Header>Edit: {dataset.name}</Modal.Header>
        <Modal.Body>
          <form action={formAction} className="flex flex-col gap-4">
            <div>
              <Label value="Name" />
              <TextInput type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label value="Source" />
              <TextInput type="text" value={source} onChange={(e) => setSource(e.target.value)} />
            </div>
            <div>
              <Label value="Keywords" />
              <TextInput type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
            </div>
            <div className="flex flex-row justify-end">
              <Button onClick={close}>Close</Button>
              <div className="grow" />
              <Button type="submit" disabled={pending || !changed}>
                Update
              </Button>
            </div>
          </form>
          <div className="mt-3">{message}</div>
        </Modal.Body>
      </Modal>
    </>
  )
}

type Item = { id: string; name: string }
type Kind = "dataset" | "dataset group"

export function DeleteItem({ item, kind }: { item: Item; kind: Kind }) {
  const router = useRouter()
  const { pending } = useFormStatus()
  const [show, setShow] = useState(false)
  const [needRefresh, setNeedRefresh] = useState(false)
  const [message, setMessage] = useState("")

  async function formAction() {
    setMessage(`Deleting {kind}...`)
    const rsp = await deleteItem(kind, item.id)
    switch (rsp.type) {
      case "error":
        setMessage(rsp.message)
        break
      case "deleted":
        setNeedRefresh(true)
        close()
        break
    }
  }

  function close() {
    if (needRefresh) router.refresh()
    setShow(false)
  }

  return (
    <>
      <span className="underline" onClick={() => setShow(true)}>
        Delete
      </span>
      <Modal show={show} onClose={close}>
        <Modal.Header>Delete: {item.name}</Modal.Header>
        <Modal.Body>
          <form action={formAction} className="flex flex-col gap-4">
            <div>
              Are you sure you want to delete {kind} <span className="font-bold">{item.name}</span>?
            </div>
            <div className="flex flex-row justify-end">
              <Button onClick={close}>Cancel</Button>
              <div className="grow" />
              <Button type="submit" disabled={pending}>
                Delete
              </Button>
            </div>
          </form>
          <div className="mt-3">{message}</div>
        </Modal.Body>
      </Modal>
    </>
  )
}

export function EditGroupDatasets({ group, datasets }: { group: DatasetGroup; datasets: Dataset[] }) {
  const [setIds, setSetIds] = useState(group.setIds)

  function datasetItem(ds: Dataset) {
    const isOn = setIds.includes(ds.id)
    async function updateGroup() {
      const newIds = isOn ? setIds.filter((id) => id !== ds.id) : setIds.concat([ds.id])
      setSetIds(newIds)
      await updateDatasetGroup(group.id, { setIds: newIds })
    }
    return (
      <Dropdown.Item key={ds.id} onClick={() => updateGroup()}>
        {isOn ? <FaRegCheckSquare /> : <FaRegSquare />} &nbsp; {ds.name}
      </Dropdown.Item>
    )
  }

  const label = setIds.length == 1 ? "1 Dataset" : `${setIds.length} Datasets`
  return (
    <Dropdown label={label} placement="right-start" dismissOnClick={false}>
      {datasets.map(datasetItem)}
    </Dropdown>
  )
}

export function EditGroupDateRange({ group }: { group: DatasetGroup }) {
  const startRange: DateRange = {}
  if (group.fromDate) startRange.from = toYMD(group.fromDate)
  if (group.toDate) startRange.to = toYMD(group.toDate)
  const [range, setRange] = useState(startRange)

  async function setAndSaveRange(range: DateRange) {
    setRange(range)
    const fromDate = range.from ? new Date(range.from) : null
    const toDate = range.to ? new Date(range.to) : null
    await updateDatasetGroup(group.id, { fromDate, toDate })
  }
  return <PickDateRange range={range} setRange={setAndSaveRange} title={""} />
}

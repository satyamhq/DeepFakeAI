"use server"

import { Dataset, DatasetGroup } from "@prisma/client"
import { db, getServerRole } from "../../server"

type ErrorCase = { type: "error"; message: string }
const mkError = (message: string): ErrorCase => ({ type: "error", message })

export type StoreResponse = ErrorCase | { type: "stored"; id: string }

export async function storeDataset(data: Dataset): Promise<StoreResponse> {
  const role = await getServerRole()
  if (!role.internal) return mkError("Not allowed.")

  // if this dataset already has an id, we're just updating it, otherwise creating
  let id = data.id
  if (id) {
    await db.dataset.update({ where: { id: data.id }, data })
  } else {
    delete (data as any)["id"]
    id = (await db.dataset.create({ data })).id
  }

  return { type: "stored", id }
}

export type DeleteResponse = ErrorCase | { type: "deleted"; id: string }

export async function deleteItem(kind: string, id: string): Promise<DeleteResponse> {
  const role = await getServerRole()
  if (!role.internal) return mkError("Not allowed.")

  let deleted: any = undefined
  switch (kind) {
    case "dataset":
      deleted = await db.dataset.delete({ where: { id } })
      break
    case "dataset group":
      deleted = await db.datasetGroup.delete({ where: { id } })
      break
  }
  if (!deleted) return mkError(`No ${kind} with id: ${id}`)

  return { type: "deleted", id }
}

export type CreateGroupResponse = ErrorCase | { type: "created"; id: string }

export async function createDatasetGroup(name: string): Promise<CreateGroupResponse> {
  const role = await getServerRole()
  if (!role.internal) return mkError("Not allowed.")

  const id = (await db.datasetGroup.create({ data: { name } })).id

  return { type: "created", id }
}

export type UpdateGroupResponse = ErrorCase | { type: "updated"; id: string }

export async function updateDatasetGroup(id: string, data: Partial<DatasetGroup>): Promise<UpdateGroupResponse> {
  const role = await getServerRole()
  if (!role.internal) return mkError("Not allowed.")

  const updated = !!(await db.datasetGroup.update({ where: { id }, data }))

  return updated ? { type: "updated", id } : mkError("No such dataset group.")
}

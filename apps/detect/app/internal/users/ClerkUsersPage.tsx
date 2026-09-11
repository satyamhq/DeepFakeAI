"use client"

import { Fragment, useState } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { Button, Modal } from "flowbite-react"
import { table, showText } from "../ui"
import { banUser, deleteClerkUser, unbanUser } from "./actions"
import Link from "next/link"

import { ClockIcon } from "../../components/icons"
import DateLabel from "../../components/DateLabel"
import { useUser } from "@clerk/nextjs"
import { getRoleByUser } from "../../auth"

function BanUser({ id, email, isAdmin, isBanned }: { id: string; email: string; isAdmin: boolean; isBanned: boolean }) {
  const router = useRouter()
  const { pending } = useFormStatus()
  const [showConfirm, setShowConfirm] = useState(false)
  const label = isBanned ? "Unban" : "Ban"

  async function onSubmit() {
    if (isBanned) {
      await unbanUser(id)
    } else {
      await banUser(id)
    }
    setShowConfirm(false)
    router.refresh()
  }

  return (
    <form action={onSubmit}>
      <Button size="xs" onClick={() => setShowConfirm(true)} disabled={!isAdmin}>
        {label}
      </Button>
      <Modal show={showConfirm} onClose={() => setShowConfirm(false)}>
        <Modal.Header>
          {label} <b>{email}</b>?
        </Modal.Header>
        <Modal.Body>
          <div>Banning a user will immediately log the user out, and they will be unable to sign back in.</div>
        </Modal.Body>
        <Modal.Footer className="justify-end">
          <form action={onSubmit}>
            <Button type="submit" disabled={pending}>
              {label}
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

function DeleteUser({ user, email, isAdmin }: { user: UserTableRow; email: string; isAdmin: boolean }) {
  const router = useRouter()
  const { pending } = useFormStatus()
  const [showConfirm, setShowConfirm] = useState(false)

  async function onSubmit() {
    await deleteClerkUser(user.id, user.externalId)
    router.refresh()
  }
  return (
    <form action={onSubmit}>
      <Button size="xs" onClick={() => setShowConfirm(true)} disabled={!isAdmin}>
        Delete
      </Button>
      <Modal show={showConfirm} onClose={() => setShowConfirm(false)}>
        <Modal.Header>
          Delete <b>{email}</b>?
        </Modal.Header>
        <Modal.Body>
          <div>
            This will delete their personal query history, but not the metadata for media that was analyzed as a result
            of their queries.
          </div>
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

export type UserTableRow = {
  id: string
  externalId: string | null
  email: string | null
  firstName: string | null
  lastName: string | null
  location: string | null
  createdAt: Date
  banned: boolean
}

export default function UsersPage({
  users,
  userIdToOrgs,
}: {
  users: UserTableRow[]
  userIdToOrgs: Record<string, { id: string; name: string }[]>
}) {
  const { user } = useUser()
  const role = getRoleByUser(user)

  const admin = role.admin
  return (
    <>
      {table(
        users,
        (user) => user.id,
        ["Created", "Identifiers", "Email", "Name", "Org", "View", "", ""],
        [
          (user) => <DateLabel date={user.createdAt} />,
          (user) => (
            <div className="flex flex-col justify-center items-left">
              <div>ID:&nbsp;{user.id}</div>
              <div>DB:&nbsp;{user.externalId || "<none>"}</div>
            </div>
          ),
          (user) => showText(user.email ?? "<missing>"),
          (user) => showText(`${user.firstName || ""} ${user.lastName || ""}`.trim()),
          (user) => {
            const orgs = userIdToOrgs[user.id]
            return (
              <div>
                {orgs.map((org, index) => {
                  return (
                    <Fragment key={index}>
                      <Link
                        prefetch={false}
                        className="underline text-blue-500"
                        href={`/media/history?as=${org.id}&allOrg=true`}
                      >
                        {org.name}
                      </Link>
                      {index < orgs.length - 1 && <span>, </span>}
                    </Fragment>
                  )
                })}
              </div>
            )
          },
          (user) => (
            <div className="text-center">
              <Link href={`/media/history?as=${user.id}`}>
                <ClockIcon />
              </Link>
            </div>
          ),
          (user) => <BanUser id={user.id} email={user.email ?? ""} isAdmin={admin} isBanned={user.banned} />,
          (user) => <DeleteUser user={user} email={user.email ?? ""} isAdmin={admin} />,
        ],
      )}
    </>
  )
}

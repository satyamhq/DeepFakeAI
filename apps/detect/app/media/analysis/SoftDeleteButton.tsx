"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button, Modal } from "flowbite-react"
import { softDeleteQuery } from "./actions"
import { RedButton } from "../../components/Buttons"

export default function DeleteButton({ postUrl, redirectPath }: { postUrl: string; redirectPath?: string }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function onConfirmed() {
    setPending(true)
    try {
      const modifiedCount = await softDeleteQuery(postUrl)
      if (modifiedCount === 0) {
        setError("Sorry, we couldn't find a history record for you to delete.")
        return
      }
      if (redirectPath) {
        router.push(redirectPath)
      } else {
        // redirect to homepage by default
        router.push("/")
      }
    } catch (e) {
      setError("An error occurred while deleting this record, please try again later.")
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <RedButton className="m-auto" size="xs" onClick={() => setShowConfirm(true)}>
        Delete
      </RedButton>
      <Modal show={showConfirm} onClose={() => setShowConfirm(false)}>
        <Modal.Header>Delete this page?</Modal.Header>
        <Modal.Body>
          <div className="text">
            Are you sure you want to delete this page from your history?
            <br />
            This action is permanent.
          </div>
          {error && <div className="text-red-500">{error}</div>}
        </Modal.Body>
        <Modal.Footer className="justify-end">
          <Button color="gray" disabled={pending} onClick={() => setShowConfirm(false)}>
            No, cancel
          </Button>
          <Button onClick={onConfirmed} disabled={pending} color="red">
            Yes, I&apos;m sure
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

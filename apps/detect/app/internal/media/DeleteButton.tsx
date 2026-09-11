"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { Button, Modal } from "flowbite-react"
import { deleteMedia } from "./actions"

export default function DeleteButton({
  mediaId,
  isAdmin,
  redirectPath,
}: {
  mediaId: string
  isAdmin: boolean
  redirectPath?: string
}) {
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()
  const { pending } = useFormStatus()

  async function onSubmit() {
    await deleteMedia(mediaId)
    if (redirectPath) {
      router.push(redirectPath)
    } else {
      router.refresh()
    }
  }

  return (
    <>
      <Button className="m-auto" size="xs" disabled={!isAdmin} onClick={() => setShowConfirm(true)}>
        Delete
      </Button>
      <Modal show={showConfirm} onClose={() => setShowConfirm(false)}>
        <Modal.Header>Delete {mediaId}?</Modal.Header>
        <Modal.Body>
          <div>
            This will invalidate any saved URLs for this media. If the social media post is queried again, its media
            will be re-resolved and re-analyzed.
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
    </>
  )
}

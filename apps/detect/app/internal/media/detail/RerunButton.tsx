"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { Button, Modal } from "flowbite-react"
import { processors } from "../../../model-processors/all"
import { forceReeval } from "./actions"

export default function RerunButton({ mediaId, source }: { mediaId: string; source: string }) {
  const [showRerun, setShowRerun] = useState(false)
  const { pending } = useFormStatus()
  const proc = processors[source]

  async function onSubmit() {
    const res = await forceReeval(mediaId, proc.id)
    if (res.type != "ready") console.warn(res)
    else {
      setShowRerun(false)
      window.location.reload()
    }
  }
  return (
    <>
      <Modal show={showRerun} onClose={() => setShowRerun(false)}>
        <Modal.Header>Reevaluate media?</Modal.Header>
        <Modal.Body>
          <div>
            Resubmit media to <span className="text-lime-500">{proc.name}</span> for re-evaluation?
          </div>
          <div>
            Media: <span className="text-lime-500">{mediaId}</span>
          </div>
          <div>
            Processor id: <span className="text-lime-500">{proc.id}</span>
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-end">
          <form action={onSubmit}>
            <Button type="submit" disabled={pending}>
              Do it!
            </Button>
          </form>
          <Button color="gray" onClick={() => setShowRerun(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
      <Button size="xs" onClick={() => setShowRerun(true)}>
        Rerun
      </Button>
    </>
  )
}

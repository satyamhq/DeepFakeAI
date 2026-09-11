"use client"

import { useState } from "react"
import { Button, Modal } from "flowbite-react"
import { processors } from "../../../model-processors/all"

export default function ShowSourceButton({ source, raw }: { source: string; raw: any }) {
  const [showRaw, setShowRaw] = useState(false)
  const proc = processors[source]
  return (
    <>
      <Modal show={showRaw} onClose={() => setShowRaw(false)}>
        <Modal.Header>{proc.name} API Response</Modal.Header>
        <Modal.Body>
          <pre>{JSON.stringify(raw, null, "  ")}</pre>
        </Modal.Body>
      </Modal>
      <Button size="xs" onClick={() => setShowRaw(true)}>
        JSON
      </Button>
    </>
  )
}

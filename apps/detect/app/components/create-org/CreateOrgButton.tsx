"use client"

import { CreateOrganization } from "@clerk/nextjs"
import { Button, ButtonProps, Modal } from "flowbite-react"
import { useState } from "react"

/**
 * A button that opens a modal to create an organization.
 */
export default function CreateOrgButton(props: Omit<ButtonProps, "href" | "onClick">) {
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  return (
    <>
      <Button {...props} onClick={() => setShowCreateOrg(true)}>
        {props.children || "Create Organization"}
      </Button>
      <Modal
        show={showCreateOrg}
        onClose={() => setShowCreateOrg(false)}
        dismissible
        popup
        theme={{ content: { base: "relative h-full p-4 md:h-auto" } }}
      >
        <Modal.Header className="p-0 h-0 z-20" />
        <Modal.Body className="p-0">
          <CreateOrganization
            hideSlug
            routing="hash"
            appearance={{
              elements: {
                card: "bg-transparent",
                cardBox: "shadow-none",
                rootBox: "",
              },
            }}
          />
        </Modal.Body>
      </Modal>
    </>
  )
}

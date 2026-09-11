"use client"

import { useState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { Trulean, UserFeedback } from "@prisma/client"
import { Button, Modal, Textarea } from "flowbite-react"
import { FaRegCheckCircle } from "react-icons/fa"
import { FaRegCircleXmark } from "react-icons/fa6"
import { saveFeedback } from "./actions"
import { GreenButton, RedButton } from "../../components/Buttons"

const stringForTrulean: Record<Trulean, string> = {
  UNKNOWN: "unknown",
  TRUE: "fake",
  FALSE: "real",
  UNREVIEWED: "unknown", // not shown in UI
}

const FakeButton = ({ isSelected, onClick }: { isSelected: boolean; onClick?: () => void }) => (
  <RedButton isActive={isSelected} onClick={onClick}>
    <FaRegCircleXmark className="inline mr-2 mb-1" />
    Fake
  </RedButton>
)

const RealButton = ({ isSelected, onClick }: { isSelected: boolean; onClick?: () => void }) => (
  <GreenButton isActive={isSelected} onClick={onClick}>
    <FaRegCheckCircle className="inline mr-2 mb-1" />
    Real
  </GreenButton>
)

const savedMessage = (fakeness?: Trulean) => {
  if (!fakeness || fakeness === "UNKNOWN") {
    return ""
  }
  const fakenessString = stringForTrulean[fakeness]
  return `Thank you for sharing that this is ${fakenessString}.`
}

export default function SendFeedback({
  mediaId,
  currentUserFeedback,
}: {
  mediaId: string
  currentUserFeedback?: UserFeedback
}) {
  const [message, setMessage] = useState(savedMessage(currentUserFeedback?.fake))
  const [showModal, setShowModal] = useState(false)
  const [savedFakeness, setSavedFakeness] = useState<Trulean>(
    currentUserFeedback ? currentUserFeedback.fake : "UNKNOWN",
  )
  const [pendingFakeness, setPendingFakeness] = useState<Trulean>("UNKNOWN")
  const [comments, setComments] = useState(currentUserFeedback ? currentUserFeedback.comments : "")
  const { pending } = useFormStatus()

  useEffect(() => setMessage(savedMessage(savedFakeness)), [savedFakeness])

  useEffect(() => {
    // When fakeness button is chosen, show a dialog to submit the choice
    setShowModal(pendingFakeness === "UNKNOWN" ? false : true)
  }, [pendingFakeness])

  const handleClose = () => setPendingFakeness("UNKNOWN")

  async function onSubmit(data: FormData) {
    const comments = ((data.get("comments") as string) ?? "").trim()

    const rsp = await saveFeedback(mediaId, pendingFakeness, comments)
    switch (rsp.type) {
      case "error":
        setMessage(rsp.message)
        break
      case "saved":
        setSavedFakeness(pendingFakeness)
        handleClose()
        break
    }
  }

  const fakenessString = stringForTrulean[pendingFakeness]

  return (
    <>
      <div className="bg-gray-700 rounded-lg px-5 py-3 flex flex-row items-center gap-5">
        <div className="grow">
          {message || (
            <>
              <span className="font-bold">What do you think?</span> Help make our analysis better by adding your
              assessment and context.
            </>
          )}
        </div>
        <RealButton isSelected={savedFakeness === "FALSE"} onClick={() => setPendingFakeness("FALSE")} />
        <FakeButton isSelected={savedFakeness === "TRUE"} onClick={() => setPendingFakeness("TRUE")} />
      </div>
      <Modal show={showModal} onClose={handleClose}>
        <form action={onSubmit}>
          <Modal.Header>{`Why do you think this is ${fakenessString}?`}</Modal.Header>
          <Modal.Body>
            <span>Can you share news articles or the original source?</span>
            <Textarea
              name="comments"
              rows={3}
              placeholder="Optional links or comment"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="resize-none text-l w-full rounded-md border-gray-300 shadow-sm focus:border-lime-500 focus:ring-lime-500 mt-2"
            />
          </Modal.Body>
          <Modal.Footer className="justify-end">
            <Button type="submit" disabled={pending}>
              {savedFakeness === "UNKNOWN" ? "Submit" : "Resubmit"}
            </Button>
            <Button color="gray" onClick={handleClose}>
              Cancel
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  )
}

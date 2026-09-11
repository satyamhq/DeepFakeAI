"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { Button, Card, Modal, Radio, Textarea, Tooltip } from "flowbite-react"
import { siteUrl } from "../../site"
import { JoinedMedia } from "../../data/media"
import { meansFake, meansHumanVerified, determineFake } from "../../data/groundTruth"
import { markAsPostedToX } from "./actions"
import { fetchJson } from "../../fetch"

const fakeContent = "🔴 Verified MANIPULATED. Stay informed to separate truth from fiction. We caught it here:"
const realContent =
  "🟢 Verified REAL. One of AI’s greatest dangers is it can undermine our trust in reality. More analysis:"

export default function PostToXButton({ media, isReady }: { media: JoinedMedia; isReady: boolean }) {
  const groundTruth = determineFake(media)
  const isHumanVerified = meansHumanVerified(groundTruth)
  const url = `${siteUrl}/media/analysis?id=${media.id}`
  const imagePreviewUrl = `/api/thumbnail-overlay?mediaId=${media.id}`

  const [showConfirm, setShowConfirm] = useState(false)
  const [shouldIncludeGraphic, setShouldIncludeGraphic] = useState(false)
  const [hasBeenPosted, setHasBeenPosted] = useState(media.postedToX)
  const [postText, setPostText] = useState(meansFake(groundTruth) ? fakeContent : realContent)
  const [errorText, setErrorText] = useState<string | undefined>(undefined)
  const { pending } = useFormStatus()

  const handleToggleImage = () => setShouldIncludeGraphic((prevState) => !prevState)
  const handleClose = () => setShowConfirm(false)
  const handlePosted = () => {
    setHasBeenPosted(true)
    markAsPostedToX(media.id)
    handleClose()
  }

  async function onSubmit(data: FormData) {
    const postText = ((data.get("postText") as string) ?? "").trim()
    const text = `${postText} ${url}`

    const [code, json] = await fetchJson("/api/post-to-x", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        shouldIncludeGraphic,
      }),
    })

    if (code === 200) {
      handlePosted()
    } else {
      setErrorText(String(json))
    }
  }

  const RadioButtonGroup = () => (
    <div className="flex flex-col mb-3 ml-5">
      <div className="flex items-center">
        <Radio id="thumb" name="thumb" className="mr-2" checked={!shouldIncludeGraphic} onChange={handleToggleImage} />
        <label htmlFor="thumb">Use thumbnail preview (preferred)</label>
      </div>
      <div className="flex items-center">
        <Radio id="image" name="image" className="mr-2" checked={shouldIncludeGraphic} onChange={handleToggleImage} />
        <label htmlFor="image">Use default graphic (choose if no preview available)</label>
      </div>
    </div>
  )

  const postToXDisabledReason = !isReady
    ? "Model results are pending, so the preview is not available."
    : !isHumanVerified
      ? "Verify and set Ground Truth before posting."
      : hasBeenPosted
        ? "This analysis has already been posted to X.com"
        : undefined

  return (
    <>
      <Tooltip content={postToXDisabledReason}>
        <Button
          className="m-auto min-w-24"
          size="xs"
          disabled={!!postToXDisabledReason}
          onClick={() => setShowConfirm(true)}
        >
          Post to X...
        </Button>
      </Tooltip>
      <Modal show={showConfirm} onClose={handleClose}>
        <form action={onSubmit}>
          <Modal.Header>Post to all our X followers?</Modal.Header>
          <Modal.Body>
            <div className="mb-3">
              You are about to share a breaking news post on X.com to all our followers at{" "}
              <a className="underline" href="https://x.com/truemediadotorg" rel="noopener noreferrer" target="_blank">
                @truemediadotorg
              </a>
              . You can customize the text before posting.
            </div>
            <RadioButtonGroup />
            <Card className="border-red-100">
              <img src={shouldIncludeGraphic ? "/breaking-news.png" : imagePreviewUrl} alt="Image preview" />
              <Textarea
                name="postText"
                rows={2}
                placeholder="Text to post on X"
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                className="resize-none text-l w-full rounded-md border-gray-300 shadow-sm focus:border-lime-500 focus:ring-lime-500 mt-2"
              />
              <a href={url} className="underline text-blue-500" rel="noopener noreferrer" target="_blank">
                {url}
              </a>
            </Card>
            <div className="mt-3">Are you ready to broadcast this post publicly?</div>
          </Modal.Body>
          <Modal.Footer className="justify-end">
            {errorText && <div className="mr-3">{errorText}</div>}
            <Button type="submit" disabled={pending}>
              Post it!
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

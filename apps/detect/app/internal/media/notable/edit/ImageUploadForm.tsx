"use client"

import { FileInput } from "flowbite-react"
import type { PutBlobResult } from "@vercel/blob"
import { Dispatch, SetStateAction, useRef } from "react"
import { FORM_ERROR, FORM_IMAGE_UPLOADED, FORM_UPLOADING, FormState } from "./NotableMediaEditor"

type Props = {
  onPreviewImageUploaded: (url: string) => void
  setFormState: Dispatch<SetStateAction<FormState>>
}
export default function ImageUploadForm({ onPreviewImageUploaded, setFormState }: Props) {
  const inputFileRef = useRef<HTMLInputElement>(null)

  const upload = (event: React.SyntheticEvent) => {
    event.preventDefault()

    if (!inputFileRef.current?.files) {
      setFormState(FORM_ERROR("Error: you must must select a file to upload."))
      return
    }

    setFormState(FORM_UPLOADING)
    const file = inputFileRef.current.files[0]
    fetch(`/internal/media/notable/edit/upload?filename=${file.name}`, {
      method: "POST",
      body: file,
    })
      .then((res) => res.json())
      .then((jsonBlob: PutBlobResult) => {
        setFormState(FORM_IMAGE_UPLOADED)
        onPreviewImageUploaded(jsonBlob.url)
      })
      .catch(() => setFormState(FORM_ERROR()))
  }

  return (
    <div>
      <form onSubmit={upload}>
        <div className="">
          <FileInput className="flex" sizing="xl" name="file" ref={inputFileRef} onChange={upload} required />
        </div>
      </form>
    </div>
  )
}

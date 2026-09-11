"use client"

import { useState } from "react"
import { Button } from "flowbite-react"
import { createNotableMedia } from "./actions"

export default function AddNotableMedia() {
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  async function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    setIsLoading(true)

    const data = new FormData(ev.currentTarget)
    const mediaId = ((data.get("media-id") as string) ?? "").trim()
    const result = await createNotableMedia(mediaId)

    if (result.error) {
      setErrorMessage(result.message)
    }

    setIsLoading(false)
  }

  return (
    <>
      <div>
        <p>Add notable media</p>
        <form className="flex" onSubmit={onSubmit}>
          <input className="text-black" type="text" placeholder="id" name="media-id" disabled={isLoading} />
          <Button type="submit" disabled={isLoading} color="gray">
            Add
          </Button>
        </form>
        {errorMessage ? <p className="text-red-500">{errorMessage}</p> : null}
      </div>
    </>
  )
}

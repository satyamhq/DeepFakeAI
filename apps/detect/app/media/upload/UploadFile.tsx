"use client"

import { useEffect, useState } from "react"
import { Button, Card, FileInput, Progress, Tooltip } from "flowbite-react"
import { useRouter } from "next/navigation"

import { analyzeUrl } from "../../data/media"

import axios from "axios"
import { checkIsCurrentUserThrottled } from "../../throttle/actions"
import { InnerAccentContainer } from "../../QueryPageTabs"
import { UserType } from "../../types/db"

const FILE_LIMIT_MB = 100
const BYTES_PER_MB = 1024 * 1024

const SUPPORTED_FILE_EXTENSIONS_BY_TYPE = {
  Image: ["png", "jpg", "jpeg", "webp", "gif", "tiff"],
  Video: ["webm", "mp4", "wmv", "avi", "flv", "mov", "webp", "mkv"],
  Audio: ["ogg", "m4a", "wav", "flac", "mp3", "aac"],
}

// union all file extensions into 1 list
const ALL_SUPPORTED_FILE_EXTENSIONS = Object.values(SUPPORTED_FILE_EXTENSIONS_BY_TYPE).flat()

const FILE_REQUIREMENTS = {
  ...SUPPORTED_FILE_EXTENSIONS_BY_TYPE,
  "File size limits": [`${FILE_LIMIT_MB}MB`, "4 minutes"],
}

export default function UploadFile() {
  const { state, submitDisabled, inputDisabled, targetFile, setTargetFile, onSubmit } = useUploadFileState()

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setTargetFile(event.target.files?.[0] || null)
  }

  const UploadButton = () => (
    <Button className="w-full" onClick={onSubmit} disabled={submitDisabled}>
      <div className="w-full">{state.type === "uploading" ? "Uploading..." : "Upload"}</div>
    </Button>
  )
  return (
    <Card className="mb-5 gap-0 border-t-0 rounded-tl-none rounded-tr-none">
      <InnerAccentContainer>
        <form>
          <div className="text-lime-1000 pb-1 font-semibold">File upload</div>
          <FileInput onChange={handleChange} disabled={inputDisabled} />
        </form>
      </InnerAccentContainer>
      {targetFile ? (
        <UploadButton />
      ) : (
        <Tooltip content="You must choose a file to upload." theme={{ target: "w-max!" }}>
          <UploadButton />
        </Tooltip>
      )}
      {state.type === "uploading" && (
        <div className="container">
          <Progress progress={state.percentDone} size="lg" />
        </div>
      )}
      {(state.type === "formError" || state.type === "uploadError") && (
        <p className="text-red-500">{state.errorMessage}</p>
      )}
      <div className="mt-4 text-slate-400">
        <div className="uppercase">Supported files</div>
        <div className="text-sm mt-1">
          {Object.entries(FILE_REQUIREMENTS).map(([type, extensions]) => (
            <div key={type}>
              <span className="text font-semibold">{type}</span>: {extensions.join(", ")}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

type UploadState =
  | { type: "default" }
  | { type: "uploading"; percentDone: number }
  | { type: "formError"; errorMessage: string }
  | { type: "uploadError"; errorMessage: string }

function useUploadFileState() {
  const router = useRouter()
  const [targetFile, setTargetFile] = useState<File | null>(null)
  const [state, setState] = useState<UploadState>({ type: "default" })

  const submitDisabled = targetFile === null || ["uploading", "formError"].includes(state.type)
  const inputDisabled = state.type === "uploading"

  function onPercentDoneChange(percentDone: number) {
    setState({ type: "uploading", percentDone })
  }

  // validate file is valid size
  useEffect(() => {
    if (targetFile === null) {
      return
    }
    const fileSizeInMB = targetFile.size / BYTES_PER_MB
    if (fileSizeInMB > FILE_LIMIT_MB) {
      setState({
        type: "formError",
        errorMessage: `File size ${fileSizeInMB.toFixed(1)}MB exceeds ${FILE_LIMIT_MB}MB limit.`,
      })
      return
    }

    const fileName = targetFile.name
    const extension = fileName.split(".").pop() || ""
    if (!ALL_SUPPORTED_FILE_EXTENSIONS.includes(extension.toLowerCase())) {
      setState({
        type: "formError",
        errorMessage: `File type ${targetFile.name.split(".").pop()} is not supported.`,
      })
      return
    }

    // reset state if file is valid
    setState({ type: "default" })
  }, [targetFile])

  async function onSubmit() {
    if (targetFile === null) {
      return
    }
    setState({ type: "uploading", percentDone: 0 })
    try {
      const { id: mediaId, postUrl } = await uploadFileForAnalysis(targetFile, undefined, onPercentDoneChange)
      // Kick off analysis immediately so processing begins right away
      fetch(`/api/start-analysis?id=${encodeURIComponent(mediaId)}`).catch((err) => {
        console.warn("[Upload] Non-blocking start-analysis trigger:", err)
      })
      // redirect to analysis page for this id
      router.replace(analyzeUrl(mediaId, postUrl))
    } catch (e: any) {
      console.error(`Failed to upload file:`, e)
      const rawMessage = e?.message || ""
      const errorMessage =
        rawMessage.includes("Server Components render") || !rawMessage
          ? "Sorry, we couldn't upload your file. Please check your network connection and try again."
          : `Sorry, we couldn't upload your file. ${rawMessage}`
      setState({
        type: "uploadError",
        errorMessage,
      })
    }
  }

  return { state, submitDisabled, inputDisabled, targetFile, setTargetFile, onSubmit }
}

/**
 * Uploads a file directly to Supabase Storage for analysis and creates required db records
 * @param file file object to upload
 * @return the mediaId of the uploaded file that can be used to view the analysis
 */
export async function uploadFileForAnalysis(
  file: File,
  orgId: string | undefined,
  onPercentDoneChange: (percentDone: number) => void,
): Promise<{ id: string; postUrl: string }> {
  // check if we're throttled
  try {
    const isThrottled = await checkIsCurrentUserThrottled(UserType.REGISTERED)
    if (isThrottled) {
      console.warn(`Throttling request for media upload.`)
      throw new Error("Too many requests in the last hour, please try again later.")
    }
  } catch (err: any) {
    if (err?.message?.includes("Too many requests")) throw err
    // Throttle check failed (e.g. offline/network), proceed gracefully
  }

  const formData = new FormData()
  formData.append("file", file)
  if (orgId) {
    formData.append("orgId", orgId)
  }

  // Upload to Supabase-backed upload-media API with progress tracking
  const response = await axios.post("/api/upload-media", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        onPercentDoneChange(Math.min(95, Math.max(0, (progressEvent.loaded / progressEvent.total) * 100.0)))
      }
    },
    validateStatus: () => true, // Don't throw on non-2xx status so we can inspect structured errors
  })

  if (response.status !== 200 && response.status !== 201) {
    const errorMsg =
      response.data?.reason ||
      response.data?.error ||
      response.data?.message ||
      response.statusText ||
      "Upload failed."
    throw new Error(errorMsg)
  }

  onPercentDoneChange(100)
  const mediaId = response.data?.media?.id
  const postUrl = response.data?.postUrl

  if (!mediaId || !postUrl) {
    throw new Error("Server returned an incomplete upload response.")
  }

  return { id: mediaId, postUrl }
}

"use client"

import { useEffect, useState } from "react"
import { Button, Card, FileInput, Progress, Tooltip } from "flowbite-react"
import { useRouter } from "next/navigation"

import { analyzeUrl } from "../../data/media"

import { saveUploadedFile } from "./actions"
import axios from "axios"
import { checkIsCurrentUserThrottled } from "../../throttle/actions"
import { InnerAccentContainer } from "../../QueryPageTabs"
import { useOrganization } from "@clerk/nextjs"
import { UserType } from "@prisma/client"
import { createFileUpload } from "../../actions/mediares"

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
  const org = useOrganization()

  const submitDisabled = targetFile === null || ["uploading", "formError"].includes(state.type)
  const inputDisabled = state.type === "uploading" && !org.isLoaded

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
      const orgId = org.organization?.id
      const { id: mediaId, postUrl } = await uploadFileForAnalysis(targetFile, orgId, onPercentDoneChange)
      // redirect to analysis page for this id
      router.replace(analyzeUrl(mediaId, postUrl))
    } catch (e: any) {
      console.error(`Failed to upload file: ${e}`)
      setState({
        type: "uploadError",
        errorMessage: "Sorry we couldn't upload your file. " + e.message,
      })
    }
  }

  return { state, submitDisabled, inputDisabled, targetFile, setTargetFile, onSubmit }
}

/**
 * Uploads a file to s3 for analysis, creates required db records
 * @param file file object to upload
 * @return the mediaId of the uploaded file that can be used to view the analysis
 */
export async function uploadFileForAnalysis(
  file: File,
  orgId: string | undefined,
  onPercentDoneChange: (percentDone: number) => void,
): Promise<{ id: string; postUrl: string }> {
  // check if we're throttled
  const isThrottled = await checkIsCurrentUserThrottled(UserType.REGISTERED)
  if (isThrottled) {
    console.warn(`Throttling request for media upload.`)
    throw new Error("Too many requests in the last hour, please try again later.")
  }

  // ask mediares to create a new mediaId and presigned url for this file
  const uploadData = await createFileUpload(file.name)
  if (uploadData.result !== "upload") {
    throw new Error(`Failed to create file upload data for ${file.name}`)
  }

  // upload the file to s3
  console.log(`Uploading to s3 [id=${uploadData.id}, filename=${file.name}, signedUrl=${uploadData.putUrl}]`)
  const uploadResult = await axios.put(uploadData.putUrl, file, {
    headers: {
      "Content-Type": file.type,
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        // subtract 5% from the percent done to avoid the 100% completion because there's
        // still other network activity that needs to happen after the file is uploaded
        onPercentDoneChange(Math.max(0, (progressEvent.loaded / progressEvent.total) * 100.0 - 5))
      }
    },
  })
  if (uploadResult.status !== 200) {
    throw new Error(`Failed to upload file: ${uploadResult.statusText}`)
  }

  // create db records for the uploaded file
  const saveFileUploadResponse = await saveUploadedFile({
    id: uploadData.id,
    mimeType: file.type,
    filename: file.name,
    orgId,
  })
  if (saveFileUploadResponse.type === "error") {
    throw new Error(saveFileUploadResponse.message)
  }
  // the mediaUrl does double duty as the postUrl for these uploaded files
  const postUrl = saveFileUploadResponse.mediaUrl

  return { id: uploadData.id, postUrl }
}

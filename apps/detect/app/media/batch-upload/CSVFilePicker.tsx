"use client"
import { parse } from "csv-parse/browser/esm/sync"
import { Button, Modal } from "flowbite-react"
import { ReactNode, useMemo, useState } from "react"
import * as actions from "./actions"
import { useRouter } from "next/navigation"

export function CSVFilePicker() {
  const [fileContents, setFileContents] = useState<string | null>(null)
  const [fileName, setFileName] = useState("")
  const urls = useMemo(() => {
    if (fileContents == null) return null
    const data: unknown = parse(fileContents)
    if (!Array.isArray(data)) return null
    return data.flatMap((row) => row).filter((cell) => typeof cell === "string" && cell.startsWith("http"))
  }, [fileContents])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const submitBatch = async (urls: string[]) => {
    setIsLoading(true)
    try {
      const result = await actions.submitBatch(urls)
      if (result.type == "error") {
        setError(result.message)
      } else {
        setMessage("Batch submitted, redirecting...")
        router.push(`/media/batch-upload/${result.batchId}`)
      }
      setFileContents(null)
      setFileName("")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        className="text-slate-300"
        type="file"
        accept=".csv"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (file) {
            setFileName(file.name)
            setFileContents(await file.text())
          }
        }}
      />
      {message != null && <h2 className="text-green-500">{message}</h2>}
      {error != null && <h2 className="text-red-500">{error}</h2>}
      {fileContents != null && (
        <div>
          {urls == null && <h2>Invalid CSV</h2>}
          {urls != null && urls.length == 0 && <h2>No Urls found</h2>}
          {urls != null && urls.length > 0 && (
            <CSVFileInfo
              urls={urls}
              fileName={fileName}
              submitButton={
                <Button color="lime" className="self-start" disabled={isLoading} onClick={() => submitBatch(urls)}>
                  Submit {urls.length} Url{urls.length == 1 ? "" : "s"} for Analysis
                </Button>
              }
            />
          )}
        </div>
      )}
    </div>
  )
}

function CSVFileInfo({ urls, fileName, submitButton }: { urls: string[]; fileName: string; submitButton: ReactNode }) {
  const [showUrls, setShowUrls] = useState(false)
  return (
    <div>
      <Modal show={showUrls} onClose={() => setShowUrls(false)}>
        <Modal.Header>Urls</Modal.Header>
        <Modal.Body>
          {urls.map((url, i) => (
            <pre className="text-sm text-slate-300" key={i}>
              {url}
            </pre>
          ))}
        </Modal.Body>
      </Modal>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 items-center">
          <span className="text-sm text-slate-300">
            Found {urls.length} url{urls.length == 1 ? "" : "s"} in <span className="underline">{fileName}</span>
          </span>
          <Button className="inline ml-2" size="xs" onClick={() => setShowUrls((v) => !v)}>
            Preview
          </Button>
        </div>
        {submitButton}
      </div>
    </div>
  )
}

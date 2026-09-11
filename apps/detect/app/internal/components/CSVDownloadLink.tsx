"use client"

import { useRef } from "react"

export default function CSVDownloadLink({
  label,
  filename,
  generateData,
}: {
  label?: string
  filename: string
  generateData: () => string[][]
}) {
  const linkRef = useRef<HTMLAnchorElement>(null)
  function populateLink() {
    const rows = new Blob(generateData().map((row) => `${row.join(",")}\n`))
    linkRef.current!.href = URL.createObjectURL(rows)
  }
  return (
    <a ref={linkRef} className="underline" download={filename} target="_blank" onClick={populateLink}>
      {label ?? "Download CSV"}
    </a>
  )
}

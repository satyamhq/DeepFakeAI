"use client"

import { Button, Toast } from "flowbite-react"
import { useState } from "react"
import { LuClipboardCopy } from "react-icons/lu"

export default function CopyTextButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [isCopied, setCopied] = useState(false)
  return (
    <>
      <Button
        size="xs"
        outline
        onClick={() => {
          navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }}
      >
        <div className="flex items-center gap-1">
          <LuClipboardCopy />
          {label}
        </div>
      </Button>
      {isCopied && (
        <Toast className="fixed bottom-4 right-4">
          <div className="ml-3 text-sm font-normal">Copied</div>
          <Toast.Toggle onDismiss={() => setCopied(false)} />
        </Toast>
      )}
    </>
  )
}

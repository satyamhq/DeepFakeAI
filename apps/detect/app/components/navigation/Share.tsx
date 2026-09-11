"use client"

import { Button, TextInput } from "flowbite-react"
import { useEffect, useState } from "react"
import { FaClipboard, FaCheck } from "react-icons/fa"
import { usePathname } from "next/navigation"
import { LinkIcon } from "../icons"

export default function Share() {
  const [shareUrl, setShareUrl] = useState("")
  const [isShowing, setIsShowing] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const pathname = usePathname()

  // window is only available on the client. Put this inside `useEffect` to
  // prevent the server crashing trying to pre-render this client component.
  useEffect(() => {
    setShareUrl(window.location.href)
  }, [])

  const showShare = () => {
    setIsShowing(true)
    setShareUrl(window.location.href)
  }

  let timerId: ReturnType<typeof setTimeout> | undefined
  const beginClose = () => {
    timerId = setTimeout(() => {
      setIsShowing(false)
      setIsCopied(false)
    }, 1000)
  }

  const cancelClose = () => {
    clearTimeout(timerId)
  }

  const copy = () => {
    setIsCopied(true)
    navigator.clipboard.writeText(shareUrl)
  }

  // only show the Share button on a subset of pages that it is relevant to
  if (!pathname.startsWith("/media/analysis")) {
    return false
  }

  const Copy = () => (
    <Button className="pl-2 pr-2" size={"small"} color="lime">
      <FaClipboard /> <span className="ml-1 text-sm">Copy</span>
    </Button>
  )
  const Copied = () => (
    <Button className="pl-2 pr-2" size={"small"} color="lime">
      <FaCheck /> <span className="ml-1 text-sm">Copied</span>
    </Button>
  )

  return (
    <div className="mr-2" onClick={showShare} onMouseEnter={cancelClose} onMouseLeave={beginClose}>
      <div className="cursor-pointer">
        {!isShowing && <LinkIcon />}
        {!isShowing && <span className="inline ml-1">Share</span>}
        {isShowing && !isCopied && (
          <TextInput
            onClick={copy}
            className="inline cursor-pointer"
            rightIcon={Copy}
            value={shareUrl}
            readOnly
            size={50}
          />
        )}
        {isShowing && isCopied && (
          <TextInput
            onClick={copy}
            className="inline cursor-pointer"
            rightIcon={Copied}
            value={shareUrl}
            readOnly
            size={50}
          />
        )}
      </div>
    </div>
  )
}

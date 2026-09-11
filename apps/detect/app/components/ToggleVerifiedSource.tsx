"use client"

import { Media, MediaPublisher, VerifiedSource } from "@prisma/client"
import { Button } from "flowbite-react"
import { createVerifiedSource, deleteVerifiedSource } from "../internal/verified-sources/manage/actions"
import { useState } from "react"
import OptionalTooltip from "./OptionalTooltip"

// We identify MediaPublishers in many ways. For now this "Add/Remove Verified
// Source" toggle button only supports simple cases.
function isToggleableSource(source: MediaPublisher) {
  const toggleableSources: MediaPublisher[] = [
    MediaPublisher.FACEBOOK,
    MediaPublisher.INSTAGRAM,
    MediaPublisher.X,
    MediaPublisher.YOUTUBE,
    MediaPublisher.TIKTOK,
  ]
  return toggleableSources.includes(source)
}

function standardizeSources(media: Media) {
  const source = media.source
  let displayName = ""
  let platformId = ""

  if (media.source === MediaPublisher.FACEBOOK || media.source === MediaPublisher.YOUTUBE) {
    displayName = media.sourceUserName ?? ""
    platformId = media.sourceUserId ?? ""
  } else if (
    media.source === MediaPublisher.INSTAGRAM ||
    media.source === MediaPublisher.X ||
    media.source === MediaPublisher.TIKTOK
  ) {
    // X and Instagram use readable names for ids. In our DB we don't initially add a display name though we may add one later.
    displayName = ""
    platformId = media.sourceUserName ?? ""
  }

  return { source, displayName, platformId }
}

export function ToggleVerifiedSource({ media, source }: { media: Media; source: VerifiedSource | null }) {
  const [currentSource, setCurrentSource] = useState(source)
  const handleAdd = async () => {
    const standardized = standardizeSources(media)
    const created = await createVerifiedSource(standardized.source, standardized.displayName, standardized.platformId)
    if (created.saved) {
      setCurrentSource(created.saved)
    }
  }

  const handleRemove = async () => {
    if (currentSource === null) return
    const deleted = await deleteVerifiedSource(currentSource.id)
    if (!deleted.error) {
      setCurrentSource(null)
    }
  }

  const isToggleable = isToggleableSource(media.source)
  if (currentSource) {
    return (
      <Button className="text-black" color="lime" size="xs" onClick={handleRemove}>
        Remove Verified Source
      </Button>
    )
  } else {
    return (
      <OptionalTooltip content={!isToggleable ? "This source may not be toggled automatically." : ""}>
        <Button className="text-black" color="lime" size="xs" onClick={handleAdd} disabled={!isToggleable}>
          Add Verified Source
        </Button>
      </OptionalTooltip>
    )
  }
}

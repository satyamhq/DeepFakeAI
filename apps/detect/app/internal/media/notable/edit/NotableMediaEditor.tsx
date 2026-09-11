"use client"

import { Button, Select, Spinner, Textarea, TextInput } from "flowbite-react"
import { NotableMedia, Notability, Prisma, MediaPublisher, MediaType } from "@prisma/client"
import {
  FaRegTrashAlt,
  FaCode,
  FaTiktok,
  FaMastodon,
  FaYoutube,
  FaReddit,
  FaGoogleDrive,
  FaInstagram,
  FaLink,
  FaFacebook,
} from "react-icons/fa"
import { FaXTwitter } from "react-icons/fa6"
import { ReactElement, useState } from "react"
import { deleteNotableMedia, updateNotableMedia } from "../actions"
import { VideoCameraIcon, ImageIcon, MicrophoneIcon, ArrowRightIcon } from "../../../../components/icons"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ImageUploadForm from "./ImageUploadForm"

const mediaTypes: Record<MediaType, string> = {
  UNKNOWN: "Unknown",
  VIDEO: "Video",
  IMAGE: "Image",
  AUDIO: "Audio",
}

const mediaTypeIcon: Record<string, JSX.Element> = {
  VIDEO: <VideoCameraIcon />,
  IMAGE: <ImageIcon />,
  AUDIO: <MicrophoneIcon />,
}

const notabilityOptions: Record<Notability, string> = {
  NOTABLE: "Notable",
  CANDIDATE: "Candidate",
  WAS_NOTABLE: "Was Notable",
  PLAIN: "Plain",
}

const mediaSources: Record<MediaPublisher, string> = {
  UNKNOWN: "Unknown",
  X: "X",
  TIKTOK: "TikTok",
  MASTODON: "Mastodon",
  YOUTUBE: "YouTube",
  REDDIT: "Reddit",
  GOOGLE_DRIVE: "Google Drive",
  INSTAGRAM: "Instagram",
  OTHER: "Other",
  FACEBOOK: "Facebook",
}

const mediaSourceIcons: Record<string, ReactElement> = {
  UNKNOWN: <FaLink className="inline ml-2" />,
  OTHER: <FaLink className="inline ml-2" />,
  X: <FaXTwitter className="inline ml-2" />,
  TIKTOK: <FaTiktok className="inline ml-2" />,
  MASTODON: <FaMastodon className="inline ml-2" />,
  YOUTUBE: <FaYoutube className="inline ml-2" />,
  REDDIT: <FaReddit className="inline ml-2" />,
  GOOGLE_DRIVE: <FaGoogleDrive className="inline ml-2" />,
  INSTAGRAM: <FaInstagram className="inline ml-2" />,
  FACEBOOK: <FaFacebook className="inline ml-2" />,
}

export type FormState = { state: string; message?: string }

export const FORM_DEFAULT = { state: "default" }
export const FORM_UPLOADING = { state: "pending", message: "Uploading..." }
export const FORM_SAVED = { state: "success", message: "Saved." }
export const FORM_IMAGE_UPLOADED = { state: "success", message: "Image upload complete." }
export const FORM_SUCCESS_DELETED = { state: "success", message: "Deleted." }
export const FORM_ERROR = (message = "Error. Something went wrong.") => ({ state: "error", message })

type MediaWithMeta = Prisma.MediaGetPayload<{ include: { meta: true } }>

type Props = {
  media: MediaWithMeta
  notability: NotableMedia | null
}

export default function NotableMediaEditor({ media, notability }: Props) {
  const router = useRouter()

  const [title, setTitle] = useState(notability?.title ?? "")
  const [description, setDescription] = useState(notability?.description ?? "")
  const [imagePreviewUrl, setImagePreviewUrl] = useState(notability?.imagePreviewUrl ?? "")
  const [selectedMediaType, setSelectedMediaType] = useState(notability?.mediaType ?? Object.keys(mediaTypes)[0])
  const [selectedMediaSource, setSelectedMediaSource] = useState(notability?.appearedIn ?? Object.keys(mediaSources)[0])
  const [selectedNotability, setSelectedNotability] = useState(
    notability?.notability ?? Object.keys(notabilityOptions)[0],
  )

  const [formState, setFormState] = useState<FormState>(FORM_DEFAULT)

  async function saveTextAndOptions() {
    saveNotableMedia({
      title,
      description,
      notability: selectedNotability,
      appearedIn: selectedMediaSource,
      mediaType: selectedMediaType,
    })
  }

  async function saveImagePreviewUrl(imagePreviewUrl: string) {
    setImagePreviewUrl(imagePreviewUrl)
    saveNotableMedia({ imagePreviewUrl })
  }

  async function saveNotableMedia(data: Record<string, any>) {
    setFormState(FORM_UPLOADING)

    try {
      await updateNotableMedia(media.id, data)
      setFormState(FORM_SAVED)
    } catch (e) {
      setFormState(FORM_ERROR())
    }
  }

  async function handleDeleteNotableMedia() {
    setFormState(FORM_UPLOADING)

    try {
      await deleteNotableMedia(media.id)
      setFormState(FORM_SUCCESS_DELETED)
      router.push("/internal/media/notable")
    } catch (e) {
      setFormState(FORM_ERROR("Error deleting notable media. Try again."))
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t-2 border-slate-600 pt-3">
      <div className="grid grid-cols-2">
        <div>
          <b>Add Notable Deepfake</b>
        </div>
        <div className="text-right cursor-pointer">
          {/* TODO: why does the icon appear on a second line under the text? */}
          <b>Embed</b>
          <FaCode className="ml-2 inline vertical-align-bottom" />
        </div>
      </div>

      <hr className="mt-2 mb-2" />

      <div className="grid grid-cols-4">
        <div className="flex rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800 flex-col w-80">
          <div className="flex h-full flex-col justify-center gap-4 p-6">
            <div className="flex">
              <div className="flex-1 text-lg font-semibold">{title}</div>
              <div className="flex-initial justify-end ml-2">
                <span className="text-gray-400">{mediaTypeIcon[selectedMediaType]}</span>
              </div>
            </div>

            <div className="relative">
              {formState === FORM_UPLOADING && (
                <div className="absolute -translate-x-1/2 -translate-y-1/2 top-2/4 left-1/2">
                  <Spinner size="xl" />
                </div>
              )}
              <img src={imagePreviewUrl} />
            </div>

            <p className="text-gray-300 mb-8">{description}</p>

            {selectedMediaSource === "UNKNOWN" ? (
              <div className="flex justify-end">
                <Button color="gray" className="">
                  More
                  <span className="ml-2">
                    <ArrowRightIcon />
                  </span>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2">
                <div className="flex text-gray-400">
                  Appeared in
                  <span className="text-gray-400">{mediaSourceIcons[selectedMediaSource]}</span>
                </div>
                <div className="flex justify-end">
                  <Button color="gray" className="">
                    More
                    <span className="ml-2">
                      <ArrowRightIcon />
                    </span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <div>Analysis URL</div>
        <Link href={"/media/analysis?id=" + media.mediaUrl} className="underline text-gray-400">
          /media/analysis?id={media.mediaUrl}
        </Link>
      </div>

      <div className="flex">
        <div className="grow mr-2">
          <div>Card Title</div>
          <TextInput value={title} onChange={(ev) => setTitle(ev.target.value)} />
        </div>

        <div className="grow ml-2">
          <div>Appeared in</div>
          <Select
            className="grow"
            onChange={(ev) => setSelectedMediaSource(ev.target.value)}
            value={selectedMediaSource}
          >
            {Object.entries(mediaSources).map(([source, sourceLabel]) => (
              <option key={source} value={source}>
                {sourceLabel}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>Notability</div>
      <Select className="grow" onChange={(ev) => setSelectedNotability(ev.target.value)} value={selectedNotability}>
        {Object.entries(notabilityOptions).map(([key, label]) => {
          return (
            <option key={key} value={key}>
              {label}
            </option>
          )
        })}
      </Select>

      <div>Description</div>
      <Textarea value={description} onChange={(ev) => setDescription(ev.target.value)} />

      <div>Media Type</div>

      <div>
        {Object.entries(mediaTypes).map(([mediaType, mediaTypeLabel]) => {
          return (
            <label key={mediaType} className="mr-2">
              <input
                className="mr-1"
                name="media-type"
                type="radio"
                value={mediaType}
                checked={mediaType === selectedMediaType}
                onChange={(ev) => setSelectedMediaType(ev.target.value)}
              />
              {mediaTypeLabel}
            </label>
          )
        })}
      </div>

      <ImageUploadForm onPreviewImageUploaded={saveImagePreviewUrl} setFormState={setFormState} />

      <div className="mt-2">
        <div className="flex gap-2">
          <Button color="blue" onClick={saveTextAndOptions}>
            <span className="ml-2 mr-2">Update</span>
          </Button>
          <Button color="red" onClick={() => handleDeleteNotableMedia()}>
            <FaRegTrashAlt />
            <span className="ml-2 mr-2">Delete</span>
          </Button>
        </div>
        {formState.state === "pending" && <div className="text-white">{formState.message}</div>}
        {formState.state === "success" && <div className="text-yellow-200">{formState.message}</div>}
        {formState.state === "error" && <div className="text-red-500">{formState.message}</div>}
      </div>
    </div>
  )
}

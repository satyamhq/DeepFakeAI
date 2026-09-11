"use client"

import { Dispatch, SetStateAction, useState } from "react"
import { Card, Checkbox, Dropdown, Select, TextInput } from "flowbite-react"
import { FaRegSquare, FaRegCheckSquare } from "react-icons/fa"
import { MediaMetadata, Trulean, YesNoReview } from "@prisma/client"
import { JoinedMedia, emptyMeta, mediaType } from "../../data/media"
import {
  fakeLabelsWithUnreviewed,
  meansFake,
  meansHumanVerified,
  meansReal,
  determineVideoFake,
} from "../../data/groundTruth"
import ErrorBox from "../../components/ErrorBox"
import { updateMetadata } from "./actions"
import { FlowbiteCheckBadgeIcon } from "../../components/icons"
import { useUser } from "@clerk/nextjs"

const groundTruthLabels: Record<Trulean, string> = {
  ...fakeLabelsWithUnreviewed,
  UNREVIEWED: "<Needs review>",
}

const videoOverlayLabels: Record<YesNoReview, string> = {
  YES: "Yes",
  NO: "No",
  UNREVIEWED: "<Needs review>",
}

type Key = string | number | symbol

function wrapUpdated(component: JSX.Element, updated: boolean) {
  return updated ? (
    <div className="relative">
      {component}
      <div
        role="tooltip"
        className="absolute z-10 top-0 right-[100%] mr-2 inline-block text-sm text-white border rounded-lg shadow-sm border-gray-600 bg-gray-800"
      >
        <div className="px-3 py-2">Saved.</div>
      </div>
    </div>
  ) : (
    component
  )
}

function noteUpdated(setUpdated: Dispatch<SetStateAction<boolean>>) {
  setUpdated(true)
  setTimeout(() => setUpdated(false), 2000)
}

// some typescript magic to obtain only those keys of a record that have type V (or a subtype)
type KeysMatching<T extends object, V> = {
  [K in keyof T]-?: T[K] extends V ? K : never
}[keyof T]

function Choice<T extends Key>({
  disabled,
  value,
  dataKey,
  options,
  meta,
  reviewer,
  onSetChoice,
  setError,
}: {
  disabled?: boolean
  value?: string
  dataKey: KeysMatching<MediaMetadata, string>
  options: Record<T, string>
  meta: MediaMetadata
  reviewer: string
  onSetChoice?: (v: string) => void
  setError: Dispatch<SetStateAction<string>>
}) {
  const { user, isLoaded } = useUser()
  const [reviewedBy, setReviewedBy] = useState(reviewer)
  const [sel, setSel] = useState(meta[dataKey])
  const [updated, setUpdated] = useState(false)

  const isReviewKey = ["fake", "audioFake", "relabelFake", "relabelAudioFake"].includes(dataKey)
  async function update(v: string) {
    const data = { [dataKey]: v }

    let reviewerEmail = ""
    if (v !== "UNREVIEWED" && isLoaded) {
      reviewerEmail = user?.primaryEmailAddress?.emailAddress ?? ""
    }

    if (isReviewKey) {
      data[dataKey + "Reviewer"] = reviewerEmail
    }

    setReviewedBy(reviewerEmail)
    const rsp = await updateMetadata(meta.mediaId, data)
    if (onSetChoice) onSetChoice(v)
    if (rsp.type == "error") setError(rsp.message)
    else {
      setSel(v)
      noteUpdated(setUpdated)
    }
  }
  const select = (
    <div>
      <Select disabled={disabled} id={dataKey} value={value ?? sel} onChange={(e) => update(e.target.value)}>
        {Object.keys(options).map((v) => (
          <option key={v} value={v}>
            {options[v as T]}
          </option>
        ))}
      </Select>
      {reviewedBy && isReviewKey && (
        <div className="text-sm text-gray-400 text-right text-ellipsis">by {reviewedBy}</div>
      )}
    </div>
  )
  return wrapUpdated(select, updated)
}

function Toggle({
  dataKey,
  meta,
  setError,
}: {
  dataKey: KeysMatching<MediaMetadata, boolean>
  meta: MediaMetadata
  setError: Dispatch<SetStateAction<string>>
}) {
  const [sel, setSel] = useState(meta[dataKey])
  const [updated, setUpdated] = useState(false)
  async function update(v: boolean) {
    const rsp = await updateMetadata(meta.mediaId, { [dataKey]: v })
    if (rsp.type == "error") setError(rsp.message)
    else {
      setSel(v)
      noteUpdated(setUpdated)
    }
  }
  const checkbox = <Checkbox id={dataKey} checked={sel} onChange={(e) => update(e.target.checked)} />
  return wrapUpdated(checkbox, updated)
}

function TextEditor({
  dataKey,
  meta,
  setError,
}: {
  dataKey: KeysMatching<MediaMetadata, string>
  meta: MediaMetadata
  setError: Dispatch<SetStateAction<string>>
}) {
  const [savedText, setSavedText] = useState(meta[dataKey])
  return (
    <TextEditorExt
      dataKey={dataKey}
      meta={meta}
      savedText={savedText}
      setSavedText={setSavedText}
      setError={setError}
    />
  )
}

function TextEditorExt({
  dataKey,
  meta,
  savedText,
  setSavedText,
  setError,
}: {
  dataKey: KeysMatching<MediaMetadata, string>
  meta: MediaMetadata
  savedText: string
  setSavedText: Dispatch<SetStateAction<string>>
  setError: Dispatch<SetStateAction<string>>
}) {
  const [text, setText] = useState(savedText)
  const [updated, setUpdated] = useState(false)
  const [hasFocus, setHasFocus] = useState(false)
  const [modified, setModified] = useState(false)

  const saveText = async () => {
    const saveText = text.trim()
    if (saveText == savedText) return
    const rsp = await updateMetadata(meta.mediaId, { [dataKey]: saveText })
    if (rsp.type == "error") setError(rsp.message)
    else {
      setSavedText(saveText)
      setModified(false)
      setHasFocus(false)
      noteUpdated(setUpdated)
    }
  }

  const handleKeyDown = async (pressed: string) => {
    if (pressed === "Enter") await saveText()
    else if (pressed === "Escape") {
      setText(savedText)
      setModified(false)
    }
  }

  const color = modified ? "edited" : "gray"
  const input = (
    <TextInput
      sizing="sm"
      value={hasFocus ? text : savedText}
      color={color}
      onKeyDown={(e) => handleKeyDown(e.key)}
      onFocus={() => {
        setText(savedText)
        setHasFocus(true)
      }}
      onBlur={() => {
        saveText()
      }}
      onChange={(e) => {
        setText(e.target.value)
        setModified(e.target.value != savedText)
      }}
    />
  )
  return wrapUpdated(input, updated)
}

// keep these alphabetically sorted
const knownSpeakers = [
  "Alexandria Ocasio-Cortez",
  "Barack Obama",
  "David Muir",
  "Donald Trump",
  "Elon Musk",
  "Gwen Walz",
  "J.D. Vance",
  "Joe Rogan",
  "Kamala Harris",
  "Melania Trump",
  "Michelle Obama",
  "Nancy Pelosi",
  "Oprah Winfrey",
  "Rishi Sunak",
  "Robert F. Kennedy",
  "Taylor Swift",
  "Tim Walz",
  "Tom Cruise",
  "Usha Vance",
]

function SpeakersDropdown({
  meta,
  speakers,
  setSpeakers,
  setError,
}: {
  meta: MediaMetadata
  speakers: string
  setSpeakers: Dispatch<SetStateAction<string>>
  setError: Dispatch<SetStateAction<string>>
}) {
  const [updated, setUpdated] = useState(false)
  const active = speakers == "" ? new Set<string>() : new Set(speakers.split(", "))

  function speakerItem(speaker: string) {
    const isOn = active.has(speaker)
    async function toggle() {
      if (isOn) active.delete(speaker)
      else active.add(speaker)
      const newActive = Array.from(active)
      newActive.sort()
      const newSpeakers = newActive.join(", ")
      const rsp = await updateMetadata(meta.mediaId, { speakers: newSpeakers })
      if (rsp.type == "error") setError(rsp.message)
      else {
        setSpeakers(newSpeakers)
        noteUpdated(setUpdated)
      }
    }
    return (
      <Dropdown.Item key={speaker} onClick={() => toggle()}>
        {isOn ? <FaRegCheckSquare /> : <FaRegSquare />} &nbsp; {speaker}
      </Dropdown.Item>
    )
  }

  const dropdown = <Dropdown label={speakers || "<none>"}>{knownSpeakers.map(speakerItem)}</Dropdown>
  return wrapUpdated(dropdown, updated)
}

export default function MetadataEditor({ media }: { media: JoinedMedia }) {
  const meta = media.meta || emptyMeta(media.id)
  const [error, setError] = useState("")
  const [keywords, setKeywords] = useState(meta.keywords)
  const [speakers, setSpeakers] = useState(meta.speakers)
  const [fake, setFake] = useState(meta.fake)
  const [audioFake, setAudioFake] = useState(meta.audioFake)

  const [videoObjectOverlay, setVideoObjectOverlay] = useState(meta.videoObjectOverlay)
  const [videoTextOverlay, setVideoTextOverlay] = useState(meta.videoTextOverlay)
  const [videoEffects, setVideoEffects] = useState(meta.videoEffects)

  const groundTruth = mediaType(media.mimeType) == "video" ? determineVideoFake(fake, audioFake) : fake

  const truths =
    mediaType(media.mimeType) == "video" ? (
      <>
        <span>Video truth:</span>
        <Choice
          dataKey="fake"
          options={groundTruthLabels}
          meta={meta}
          reviewer={meta.fakeReviewer}
          setError={setError}
          onSetChoice={(v: string) => setFake(v as Trulean)}
        />
        <span>Audio truth:</span>
        <Choice
          dataKey="audioFake"
          options={groundTruthLabels}
          meta={meta}
          reviewer={meta.audioFakeReviewer}
          setError={setError}
          onSetChoice={(v: string) => setAudioFake(v as Trulean)}
        />
      </>
    ) : (
      <>
        <span>Ground truth:</span>
        <Choice
          dataKey="fake"
          options={groundTruthLabels}
          meta={meta}
          reviewer={meta.fakeReviewer}
          setError={setError}
          onSetChoice={(v: string) => setFake(v as Trulean)}
        />
      </>
    )

  const imageNeedsRelabeling = media.meta?.keywords.includes("image-needs-relabeling")
  const audioNeedsRelabeling = media.meta?.keywords.includes("audio-needs-relabeling")
  const videoNeedsRelabeling = media.meta?.keywords.includes("video-needs-relabeling")
  const needsRelabeling = imageNeedsRelabeling || audioNeedsRelabeling || videoNeedsRelabeling
  const relabelTruths =
    mediaType(media.mimeType) == "video" ? (
      <>
        <span>Relabel video truth:</span>
        <Choice
          disabled={!videoNeedsRelabeling}
          dataKey="relabelFake"
          options={groundTruthLabels}
          meta={meta}
          reviewer={meta.relabelFakeReviewer}
          setError={setError}
          onSetChoice={(v: string) => setFake(v as Trulean)}
        />
        <span>Relabel audio truth:</span>
        <Choice
          disabled={!audioNeedsRelabeling}
          dataKey="relabelAudioFake"
          options={groundTruthLabels}
          meta={meta}
          reviewer={meta.relabelAudioFakeReviewer}
          setError={setError}
          onSetChoice={(v: string) => setAudioFake(v as Trulean)}
        />
      </>
    ) : (
      <>
        <span>Relabel ground truth:</span>
        <Choice
          disabled={!needsRelabeling}
          dataKey="relabelFake"
          options={groundTruthLabels}
          meta={meta}
          reviewer={meta.relabelFakeReviewer}
          setError={setError}
          onSetChoice={(v: string) => setFake(v as Trulean)}
        />
      </>
    )

  return (
    <Card>
      {error ? <ErrorBox title="Update Error" message={error} /> : undefined}
      <div className="flex flex-col md:flex-row gap-5 items-top">
        <div className="grid grid-cols-[1fr_2fr] gap-y-2 items-center w-1/3">
          {truths}
          {relabelTruths}
          <div>Misleading:</div>
          <Toggle dataKey="misleading" meta={meta} setError={setError} />
          <div>No Photorealistic Faces</div>
          <Toggle dataKey="noPhotorealisticFaces" meta={meta} setError={setError} />
          <div>Language:</div>
          <TextEditor dataKey="language" meta={meta} setError={setError} />
          <div>Source:</div>
          <TextEditor dataKey="source" meta={meta} setError={setError} />
          <div>Handle:</div>
          <TextEditor dataKey="handle" meta={meta} setError={setError} />
          <div>Speakers:</div>
          <SpeakersDropdown meta={meta} speakers={speakers} setSpeakers={setSpeakers} setError={setError} />
        </div>
        <div className="flex flex-col grow gap-5">
          {media.postedToX && (
            <span>Note: This analysis is posted on X.com and may need to be deleted when changing Ground Truth.</span>
          )}
          <div className="flex gap-2 items-center pt-2">
            {meansHumanVerified(groundTruth) && <FlowbiteCheckBadgeIcon className="size-7 fill-blue-300" />}
            <div className="leading-normal mt-0.5">
              Human verdict: {meansFake(groundTruth) ? "FAKE" : meansReal(groundTruth) ? "REAL" : "Unverified"}
            </div>
          </div>
          <div>
            <div>Keywords:</div>
            <TextEditorExt
              dataKey="keywords"
              meta={meta}
              savedText={keywords}
              setSavedText={setKeywords}
              setError={setError}
            />
          </div>
          <div>
            <div>Public comments:</div>
            <TextEditor dataKey="comments" meta={meta} setError={setError} />
          </div>
          {mediaType(media.mimeType) == "video" && (
            <>
              <div className="grid grid-cols-[1fr_1fr] gap-y-2 items-center w-96">
                <span>Video Object Overlay:</span>
                <Choice
                  value={videoObjectOverlay}
                  dataKey="videoObjectOverlay"
                  options={videoOverlayLabels}
                  meta={meta}
                  reviewer={meta.audioFakeReviewer}
                  setError={setError}
                  onSetChoice={(v: string) => setVideoObjectOverlay(v as YesNoReview)}
                />
                <span>Video Text Overlay:</span>
                <Choice
                  value={videoTextOverlay}
                  dataKey="videoTextOverlay"
                  options={videoOverlayLabels}
                  meta={meta}
                  reviewer={meta.audioFakeReviewer}
                  setError={setError}
                  onSetChoice={(v: string) => setVideoTextOverlay(v as YesNoReview)}
                />
                <span>Video Effects & Filters:</span>
                <Choice
                  value={videoEffects}
                  dataKey="videoEffects"
                  options={videoOverlayLabels}
                  meta={meta}
                  reviewer={meta.audioFakeReviewer}
                  setError={setError}
                  onSetChoice={(v: string) => setVideoEffects(v as YesNoReview)}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

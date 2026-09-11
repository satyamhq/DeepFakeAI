import { useContext } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Button, Card } from "flowbite-react"
import { MdOutlineBrokenImage } from "react-icons/md"
import type { ResolvedMedia, Transferred } from "../../services/mediares"
import { getApplicableProcessors } from "../../model-processors/all"
import { formatPct } from "../../data/model"
import { durationLabel, mediaType, sizeLabel } from "../../data/media"
import { DebugContext } from "../../components/DebugContext"
import ShowMedia from "../../components/ShowMedia"
import LoadingDots from "../../components/LoadingDots"
import MediaError from "./MediaError"
import { startAnalysis } from "./ResolveMedia"
import { useUser } from "@clerk/nextjs"
import { getRoleByUser } from "../../auth"
import { fetchProgress } from "../../actions/mediares"

const POLLING_INTERVAL = 3000 // milliseconds

const isDownloading = (opts: Option[]) => opts.find((opt) => opt.state == "pending")

type FailedOption = {
  state: "failed"
  id: string
  error: string
}

type PendingOption = {
  state: "pending"
  id: string
  status: Transferred
}

type ReadyOption = {
  state: "ready"
  id: string
  audioId?: string
  mimeType: string
  duration: number | undefined
  size: number
  mediaUrl: string
  toobig: number
  processors: number
}

type Option = FailedOption | PendingOption | ReadyOption

async function fetchOptions(media: ResolvedMedia[]): Promise<Option[]> {
  const progress = await fetchProgress(media.map((mm) => mm.id))
  if (progress.result != "progress") return [{ state: "failed", id: "none", error: progress.reason }]

  const options: Option[] = []
  const statuses = Object.entries(progress.statuses)
  for (const [mediaId, status] of statuses) {
    if (status.error) options.push({ state: "failed", id: mediaId, error: status.error })
    else if (!status.url) options.push({ state: "pending", id: mediaId, status: status })
    else {
      const mm = media.find((mm) => mm.id == mediaId)!

      // Check whether this media exceeds size or duration limits for its processors. NOTE: we do not check the audio
      // track for videos because we don't have access to the size of the audio track at this point. In general the
      // video is the main size limiter, so it would be rare for the video to be an allowed size but not the audio.
      const type = mediaType(mm.mimeType)
      const procs = getApplicableProcessors(type)
      let toobig = 0
      for (const proc of procs) {
        if (
          (proc.maxSize && proc.maxSize < status.total) ||
          (mm.duration && proc.maxDuration && mm.duration > proc.maxDuration)
        ) {
          toobig += 1
        }
      }

      options.push({
        state: "ready",
        id: mediaId,
        audioId: mm.audio?.id,
        mimeType: mm.mimeType,
        duration: mm.duration,
        size: status.total,
        mediaUrl: status.url,
        toobig,
        processors: procs.length,
      })
    }
  }
  return options
}

function PendingOption({ status }: { status: Transferred }) {
  const { transferred, total } = status
  const msg =
    total <= 0 ? undefined : `${(transferred / (1024 * 1024)).toFixed(1)}MB - ${formatPct(transferred / total)}`
  return (
    <Card>
      <div className="text-bold text-center">Downloading Media</div>
      <LoadingDots color="#FFF" />
      {status ? <div className="text-center">{msg}</div> : undefined}
    </Card>
  )
}

function ShowReadyOption({ option, start, auto }: { option: ReadyOption; start: Starter; auto: boolean }) {
  const { id, mimeType, mediaUrl, toobig, duration, size } = option
  return (
    <>
      {auto && <div className="sm:text-xl">Starting analysis...</div>}
      <ShowMedia id={id} url={mediaUrl} mimeType={mimeType} controls={false} maxHeight="max-h-96" />
      {toobig > 0 && (
        <>
          <div className="flex">
            <span>Size: {sizeLabel(size)}</span>
            <span className="grow" />
            {!!duration && <span>Duration: {durationLabel(duration)}</span>}
          </div>
          <div className="text-red-500">
            This media is too large for the most accurate results. If you analyze, results will be limited.
          </div>
        </>
      )}
      {!auto && (
        <div className="flex justify-center">
          <Button className="mr-2 w-32" onClick={() => start(id, mimeType)}>
            Analyze
          </Button>
          {toobig > 0 && (
            <>
              <Button className="w-32" color="gray" href="/">
                Return Home
              </Button>
            </>
          )}
        </div>
      )}
    </>
  )
}

function ErrorList({ errors }: { errors: string[] }) {
  return (
    <ul className="list-disc ml-5 text-sm text-gray-400 max-w-xl">
      {errors.map((error: string, ii: number) => (
        <li key={ii}>{error}</li>
      ))}
    </ul>
  )
}

const wrap = (content: JSX.Element) => <div className="flex flex-col gap-5 items-center">{content}</div>

const autoAnalyze = (options: Option[]) =>
  options.length === 1 && options[0].state === "ready" && options[0].toobig === 0

type Starter = (id: string, mimeType: string) => void

export default function ResolvedMedia({ postUrl, media }: { postUrl: string; media: ResolvedMedia[] }) {
  const { debug } = useContext(DebugContext)
  const { user } = useUser()
  const role = getRoleByUser(user)
  const router = useRouter()
  const start = (id: string, mimeType: string) =>
    startAnalysis(id, mimeType, postUrl, role.isNotLoggedIn, router.replace)

  // poll the status of the download and display progress
  const cacheState = useQuery({
    queryKey: ["cache_status", postUrl],
    queryFn: async () => {
      const options = await fetchOptions(media)
      // if there's only one option and it is not too big, redirect to it
      if (autoAnalyze(options)) {
        const { id, mimeType } = options[0] as ReadyOption
        start(id, mimeType)
      }
      return options
    },
    refetchInterval: (query) => (!query.state.data || isDownloading(query.state.data) ? POLLING_INTERVAL : false),
  })

  const options: JSX.Element[] = []
  function addResolveFailed(reason: string) {
    options.push(<MediaError action="resolve media" errors={[reason]} />)
  }

  const errors: string[] = []
  if (cacheState.isError) addResolveFailed(cacheState.error.message)
  else if (!cacheState.isSuccess) return wrap(<PendingOption status={{ transferred: 0, total: 0 }} />)
  else {
    for (const option of cacheState.data) {
      if (option.state == "failed") {
        // if we got only a single failure, then the whole resolution failed, so show a big error message; but if we
        // got multiple results and only one of them is a failure, then show the failure as an addendum down below
        if (cacheState.data.length == 1) addResolveFailed(option.error)
        else errors.push(`${option.id}: ${option.error}`)
      } else if (option.state == "pending") {
        options.push(<PendingOption status={option.status} />)
      } else {
        const auto = autoAnalyze(cacheState.data)
        options.push(
          <Card key={option.id} className="w-96">
            <ShowReadyOption option={option} start={start} auto={auto} />
          </Card>,
        )
      }
    }
  }

  const message = options.length > 1 ? "Select a single media item to be analyzed" : undefined
  return wrap(
    <>
      {message && <div className="sm:text-xl">{message}</div>}
      <div className="flex flex-wrap gap-5 justify-center">{options}</div>
      {errors.length > 0 && (
        <div>
          <div className="flex flex-row gap-2 items-center">
            <MdOutlineBrokenImage /> Failed to resolve {errors.length} media from the post.
          </div>
          {debug && <ErrorList errors={errors} />}
        </div>
      )}
    </>,
  )
}

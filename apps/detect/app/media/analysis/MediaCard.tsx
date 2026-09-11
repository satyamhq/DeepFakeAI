import { useContext } from "react"
import Link from "next/link"
import { Card, Tooltip } from "flowbite-react"
import { IconType } from "react-icons"
import { HiOutlineClock } from "react-icons/hi"
import { AiOutlineExperiment } from "react-icons/ai"
import { IoShareSocial } from "react-icons/io5"
import { UserFeedback, VerifiedSource } from "@prisma/client"
import { FaBug, FaDownload, FaRegCalendarCheck, FaRobot, FaTowerBroadcast, FaTrashCan } from "react-icons/fa6"
import { disclaimerText } from "../../site"
import { FetchProgress } from "../../services/mediares"
import { models, modelsFor, processors } from "../../model-processors/all"
import { JoinedMedia, iconForMimeType, typeIcons, durationLabel, sizeLabel, fileExt, mediaType } from "../../data/media"
import {
  ManipulationCategory,
  ModelResult,
  Rank,
  isEnabled,
  manipulationCategoryInfo,
  modelApplies,
} from "../../data/model"
import { computeVoteVerdict, determineVerdict, verdicts } from "../../data/verdict"
import { DebugContext } from "../../components/DebugContext"
import Badge from "../../components/Badge"
import MediaPreview from "../../components/MediaPreview"
import SourceLabel from "../../components/SourceLabel"
import SendFeedback from "./SendFeedback"
import DeleteButton from "../../internal/media/DeleteButton"
import { VerificationBadge, VerificationLabel } from "./VerificationBadge"
import ExperimentalOverlay from "./ExperimentalOverlay"
import VerdictDescription from "./VerdictDescription"
import { PlatformSourceLabel } from "../../components/PlatformSourceLabel"
import { ToggleVerifiedSource } from "../../components/ToggleVerifiedSource"
import { determineRelevance } from "../../data/relevance"
import { useUser } from "@clerk/nextjs"
import { getRoleByUser } from "../../auth"
import PostToXButton from "../../internal/media/PostToXButton"
import SoftDeleteButton from "./SoftDeleteButton"
import { gatherAnalysisCategories, shouldShowMisleadingLabel } from "./utils"
import { Misleading } from "../../components/EvidenceLabels"

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })

const downloadIcon = (Icon: IconType, filename: string, url: string) => (
  <Link target="_blank" rel="noopener noreferrer" locale={false} download={filename} href={url}>
    <Icon className="inline ml-2 align-middle" />
  </Link>
)

const Section = ({
  icon,
  title,
  subtitle,
  children,
}: {
  icon?: IconType
  title: string
  subtitle: string
  children: React.ReactNode
}) => (
  <div key={title} className="py-3 flex gap-2 text-left items-center">
    {icon && icon({ size: 20 })}
    <div className="flex flex-col grow">
      <div>{title}</div>
      <div className="text-slate-400 text-sm">{subtitle}</div>
    </div>
    {children}
  </div>
)

const rankPillColors = {
  unknown: "border-slate-600 bg-slate-600",
  low: "border-manipulation-low-500 bg-manipulation-low-500",
  uncertain: "border-manipulation-uncertain-500 bg-manipulation-uncertain-500",
  high: "border-manipulation-high-500 bg-manipulation-high-500",
  "n/a": "border-slate-400 bg-slate-400",
}

const RankPill = ({ rank }: { rank: Rank }) => (
  <div
    className={`border-2 ${rankPillColors[rank]} rounded-lg px-1.5 py-5 ${rank == "unknown" ? "blink-pill-anim" : ""}`}
  />
)

function unreadyMessage(unready: number) {
  if (unready == 1) return "Note: we are still waiting for one pending analysis."
  else if (unready == 2) return "Note: we are still waiting for two pending analyses."
  else return `Note: We are still waiting for ${unready} pending analyses.`
}

// NOTE: ready is assumed to be sorted via `compareResult` (which sorts fakest first)
function summarizeAnalyses(media: JoinedMedia, ready: ModelResult[], pending: string[], debug: boolean) {
  const type = mediaType(media.mimeType)
  const analysisRanks = gatherAnalysisCategories({ media, ready, pending })
  const rowStyles = "p-5 border-b border-gray-700"
  const analysisRows: JSX.Element[] = []
  for (const cat of Object.keys(analysisRanks) as ManipulationCategory[]) {
    const results = analysisRanks[cat]
    const info = manipulationCategoryInfo[cat]
    let catVerdict = verdicts[computeVoteVerdict(type, results)]
    if (results.length == 1 && results[0].rank != "n/a") {
      // If there's just one model in this category, use its rank directly in the summary
      catVerdict = verdicts[results[0].rank]
    }
    analysisRows.push(
      <div key={`${cat}.label`} className={`${rowStyles} flex flex-row whitespace-nowrap gap-3 items-center`}>
        {info.icon({ size: 24 })}
        <Tooltip content={info.descrip} style="light">
          <span className="hover:underline">{info.label}</span>
        </Tooltip>
      </div>,
    )
    analysisRows.push(
      <div key={`${cat}.count`} className={`${rowStyles} flex flex-row items-center justify-center hidden md:flex`}>
        {results.length}
      </div>,
    )

    const resultsUI = results.find((rr) => rr.rank == "unknown") ? (
      results.map((rr, ii) =>
        debug ? (
          <Tooltip key={ii} content={rr.modelId}>
            <RankPill rank={rr.rank} />
          </Tooltip>
        ) : (
          <RankPill key={ii} rank={rr.rank} />
        ),
      )
    ) : (
      <Badge info={catVerdict} />
    )
    analysisRows.push(
      <div key={`${cat}.results`} className={`${rowStyles} flex flex-row gap-2`}>
        {resultsUI}
      </div>,
    )
  }
  return analysisRows
}

export function MediaCard({
  media,
  progress,
  postUrl,
  ready,
  pending,
  currentUserFeedback,
  isVerifiedLabelEnabled,
}: {
  media: JoinedMedia
  progress: FetchProgress
  postUrl: string
  ready: ModelResult[]
  pending: string[]
  currentUserFeedback?: UserFeedback
  isVerifiedLabelEnabled: boolean
}) {
  const { user } = useUser()
  const role = getRoleByUser(user)

  const { debug } = useContext(DebugContext)
  const verdictResult = determineVerdict(media, ready, pending)
  const { showResults, experimentalVerdict, experimentalReasons } = verdictResult
  const vinfo = verdicts[experimentalVerdict]
  const shouldShowVerifiedLabel = experimentalVerdict === "high" && isVerifiedLabelEnabled

  const unreadyProcessors = pending
    .map((pp) => {
      const proc = processors[pp]
      if (!proc) console.error(`MediaCard showing unexpected processor [proc=${pp}]`)
      return proc
    })
    .filter(
      (proc) => isEnabled(proc) && modelsFor(proc.id).some((modelId) => modelApplies(models[modelId], media)),
    ).length

  const header = showResults ? (
    <div className={`flex justify-center pb-1 ${vinfo.mediaText} font-bold`}>
      <div className="text-nowrap">
        {unreadyProcessors == 0 ? undefined : <em>Early Results:</em>} {vinfo.longSummary}
      </div>
      {/* This is shown only on fake media, to raise awareness of false positives. 
          The feature is feature-flagged since it doesn't make sense to show this at
          all when human labeling isn't happening, since everything appears Unverified. */}
      {shouldShowVerifiedLabel && (
        <div className="ml-2">
          <VerificationLabel media={media} />
        </div>
      )}
    </div>
  ) : undefined
  const mediaView = <MediaPreview media={media} progress={progress} header={header} />
  const mediaReady = progress.result == "progress" && progress.total > 0 && progress.transferred == progress.total
  const waiting = (msg: string) => <div className="text-slate-400">{msg}</div>
  const summary = showResults ? (
    <>
      <VerdictDescription verdictResult={verdictResult} />
      <VerificationBadge media={media} verdict={experimentalVerdict} />
      {unreadyProcessors > 0 && <div>{unreadyMessage(unreadyProcessors)}</div>}
    </>
  ) : mediaReady ? (
    waiting("Waiting for pending analyses to complete.")
  ) : (
    waiting("Waiting for media download to complete.")
  )

  // unfortunately flowbite's table can't do the rounded border around the whole table that we want;
  // so we pull out our rizlas and roll our own
  const headerStyles = "bg-gray-700 uppercase text-gray-300 text-sm"
  const analysisTable = (
    <div className="grid grid-cols-[1fr_1fr] md:grid-cols-[2fr_1fr_3fr] border border-gray-700 rounded-md">
      <div className={`${headerStyles} p-5 rounded-tl-md`}>Analysis</div>
      <div className={`${headerStyles} py-5 hidden md:block`}>Detectors</div>
      <div className={`${headerStyles} p-5 rounded-tr-md`}>Results</div>
      {summarizeAnalyses(media, ready, pending, debug)}
    </div>
  )

  return (
    <div>
      <div className="text-left text-3xl mb-5">
        <b>Is this real?</b>
      </div>
      <Card>
        <div className="flex flex-row flex-wrap md:flex-nowrap gap-5">
          <div className="md:flex-1 flex flex-col gap-5 items-start">
            <div className={`flex flex-col w-full rounded-lg p-1 min-h-64 max-h-96 ${vinfo.mediaBackground} relative`}>
              {mediaView}
              {shouldShowMisleadingLabel({ media, verdict: experimentalVerdict }) && (
                <div className="absolute m-1 top-10 right-3">
                  <Misleading />
                </div>
              )}
              <ExperimentalOverlay isExperimental={experimentalReasons.length > 0} />
            </div>
            <SourceLabel url={postUrl} />
          </div>
          <div className="md:flex-1">
            <div className="bg-gray-700 rounded-lg p-3 mb-5">{summary}</div>
            {analysisTable}
            <div className="py-3 flex gap-2 text-left items-center">
              <div className="flex flex-col grow text-slate-400 text-sm">{disclaimerText}</div>
            </div>
          </div>
        </div>
        {!role.isNotLoggedIn && <SendFeedback mediaId={media.id} currentUserFeedback={currentUserFeedback} />}
      </Card>
    </div>
  )
}

export function MediaDetailsCard({
  media,
  ready,
  pending,
  longest,
  verifiedSource,
  postUrl,
  hasUserQueried,
}: {
  media: JoinedMedia
  ready: ModelResult[]
  pending: string[]
  longest: number
  verifiedSource: VerifiedSource | null
  postUrl: string
  hasUserQueried: boolean
}) {
  const { user } = useUser()
  const role = getRoleByUser(user)
  const { debug } = useContext(DebugContext)

  const { showResults, voteVerdict } = determineVerdict(media, ready, pending)
  const fileIcon = iconForMimeType(media.mimeType)

  const DownloadLinks = () =>
    role.canDownload &&
    media.size > 0 && (
      <Section icon={FaDownload} title="Download" subtitle="View or download cached media">
        <div>
          {downloadIcon(fileIcon, media.id, media.mediaUrl)}
          {media.audioId && media.audioUrl && downloadIcon(typeIcons.audio, media.audioId, media.audioUrl)}
        </div>
      </Section>
    )

  const ModelAnalysis = () =>
    debug &&
    showResults && (
      <Section icon={FaRobot} title="Model-only Analysis" subtitle="Summary if we had no ground truth">
        <Badge info={verdicts[voteVerdict]} />
      </Section>
    )

  const ExperimentalReasonSummary = () => {
    const type = mediaType(media.mimeType)
    const experimentalReasons = determineVerdict(media, ready, pending).experimentalReasons
    const experimentalReasonsBase = determineRelevance(type, ready, pending).experimentalReasons

    const isVoteOverridden = !experimentalReasonsBase.every((value, index) => value === experimentalReasons[index])

    return (
      debug &&
      showResults && (
        <Section
          icon={AiOutlineExperiment}
          title="Experimental reasons"
          subtitle="Reasons that this media is experimental"
        >
          {experimentalReasonsBase.length > 0
            ? `${experimentalReasonsBase} ${isVoteOverridden ? "(vote overridden)" : ""}`
            : "None"}
        </Section>
      )
    )
  }

  const VerifiedSourceInfo = () =>
    debug &&
    showResults && (
      <Section icon={FaTowerBroadcast} title="Source" subtitle="What account did this media come from?">
        <span className="break-all">{media.meta?.source}</span>
        <PlatformSourceLabel media={media} />
        {debug && role.canEditMetadata && <ToggleVerifiedSource media={media} source={verifiedSource} />}
      </Section>
    )

  // If a user has queried this media, they can take actions against that query record
  // Right now it's only delete but in the future might include privacy controls or other actions
  const UserQueryControls = () =>
    hasUserQueried && (
      <Section icon={FaTrashCan} title="Delete" subtitle="Delete this media from my history">
        <div className="flex flex-row flex-wrap gap-x-5 items-center">
          <SoftDeleteButton postUrl={postUrl} redirectPath="/" />
        </div>
      </Section>
    )

  const DebugLinks = () =>
    role.internal &&
    debug && (
      <Section icon={FaBug} title="Internal" subtitle="Debug actions and links">
        <div className="flex flex-row flex-wrap gap-x-5 items-center">
          <Link prefetch={false} className="underline" href={`/internal/media/detail?id=${media.id}`}>
            Analysis Debug
          </Link>
          <Link prefetch={false} className="underline" href={`/internal/media/notable/edit?id=${media.id}`}>
            Edit Notability
          </Link>
          <DeleteButton mediaId={media.id} isAdmin={true} redirectPath="/" />
        </div>
      </Section>
    )

  const PostToX = () =>
    role.internal && (
      <Section
        icon={IoShareSocial}
        title="Post this to X.com"
        subtitle="Internal employees can broadcast this analysis as breaking news to all our followers on X.com"
      >
        <PostToXButton media={media} isReady={pending.length === 0} />
      </Section>
    )

  return (
    <Card className="col-span-2">
      <div className="divide-y divide-slate-600">
        <Section icon={fileIcon} title={fileExt(media)} subtitle="File type and size">
          <div>{sizeLabel(media.size)}</div>
        </Section>
        <Section icon={HiOutlineClock} title="Processing time" subtitle="Time to analyze media">
          <div>{durationLabel(longest)}</div>
        </Section>
        <Section icon={FaRegCalendarCheck} title="Analyzed on" subtitle="When media was analyzed">
          <div className="text-right">{formatDate(media.resolvedAt)}</div>
        </Section>
        <DownloadLinks />
        <ModelAnalysis />
        <ExperimentalReasonSummary />
        <VerifiedSourceInfo />
        <UserQueryControls />
        <DebugLinks />
        <PostToX />
      </div>
    </Card>
  )
}

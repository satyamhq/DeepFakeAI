import { useContext } from "react"
import { Card } from "flowbite-react"
import { ModelResult, Processor, modelIcons, formatScore, formatPct, ranks } from "../../data/model"
import { manipulationModelInfo } from "../../model-processors/all"
import { DebugContext } from "../../components/DebugContext"
import Badge from "../../components/Badge"
import { GeneratorInfo, MIN_DISPLAY_SCORE, generators } from "../../generators"

type Progress = { transferred: number; total: number }

export function UploadingCard({ proc, progress }: { proc: Processor<any>; progress: Progress }) {
  const { debug } = useContext(DebugContext)
  if (progress.total == 0)
    return (
      <Card>
        <span>Uploading...</span>
        {debug && <div className="text-right text-xs">{proc.name}</div>}
      </Card>
    )

  const mbs = (progress.transferred / (1024 * 1024)).toFixed(1)
  const pct = formatPct(progress.transferred / progress.total)
  return (
    <Card>
      <span>
        Uploading: {mbs}MB - {pct}
      </span>
      {debug && <div className="text-right text-xs">{proc.name}</div>}
    </Card>
  )
}

export function ResultsCard({ result }: { result: ModelResult }) {
  const { debug } = useContext(DebugContext)
  const info = manipulationModelInfo(result.modelId)
  const Icon = modelIcons[info.mediaType]
  const score = result.score <= 0.01 ? "" : formatScore(result.score)
  const generatorPrediction = result.generator
  const shouldDisplayGenerator = !!generatorPrediction && generatorPrediction.score > MIN_DISPLAY_SCORE
  const generatorInfo = shouldDisplayGenerator ? generators[generatorPrediction.generator] : undefined

  const sourceRow = debug ? (
    <div className="flex text-center items-center text-xs gap-2">
      <div>{info.processor.name}</div>
    </div>
  ) : undefined

  return (
    <Card>
      <div className="flex text-left">
        <Badge info={ranks[result.rank]} />
        <div className="grow"></div>
        <span style={{ color: ranks[result.rank].badgeText }}>{!info.hideScore && score}</span>
      </div>
      <div className="flex items-center gap-2">
        <Icon /> <b>{info.name}</b>
      </div>
      {generatorInfo && (
        <div className="flex items-center gap-4">
          <GeneratorIcon info={generatorInfo} />
          <div>
            <div className="text font-semibold">{generatorInfo.displayName}</div>
            <div className="text-sm text-gray-400">Likely source</div>
          </div>
        </div>
      )}
      <div className="bg-gray-700 rounded-lg p-3 max-w-md">{info.descrip}</div>
      {sourceRow}
    </Card>
  )
}

function GeneratorIcon({ info }: { info: GeneratorInfo }) {
  return (
    <div style={{ height: 36, minWidth: 36 }} className="flex items-center justify-center rounded-lg bg-gray-700">
      {info.iconPath ? (
        <img style={{ height: 24, minWidth: 24 }} className="rounded-md" src={info.iconPath} />
      ) : (
        <span className="text font-semibold text-gray-400">{info.abbreviation}</span>
      )}
    </div>
  )
}

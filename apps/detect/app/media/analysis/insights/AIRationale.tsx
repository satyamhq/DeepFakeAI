import { useUser } from "@clerk/clerk-react"
import { JoinedMedia } from "../../../data/media"
import { CachedResults, ModelResult } from "../../../data/model"
import { getRoleByUser } from "../../../auth"
import { useContext, useState } from "react"
import { DebugContext } from "../../../components/DebugContext"
import { determineVerdict } from "../../../data/verdict"
import { determineExplanation } from "../explanation"
import { FaChevronDown, FaChevronRight } from "react-icons/fa"
import { Card } from "flowbite-react"

const MAX_DESCRIPTION_LENGTH = 400

export function AIRationaleSection({
  media,
  cached,
  ready,
  pending,
}: {
  media: JoinedMedia
  cached: CachedResults
  ready: ModelResult[]
  pending: string[]
}) {
  const { user } = useUser()
  const role = getRoleByUser(user)
  const { debug } = useContext(DebugContext)
  const [isExpanded, setIsExpanded] = useState(false)

  const { showResults, experimentalVerdict } = determineVerdict(media, ready, pending)
  const explanation = determineExplanation(cached, experimentalVerdict)
  const isLongDescription = (explanation.description?.length ?? 0) > MAX_DESCRIPTION_LENGTH

  // Only if we got a rationale from GPT _and_ it matches our verdict, show it.
  // However, we always show the explanation to internal users with `debug` turned on.
  if (!showResults || !explanation.description || (!(debug && role.internal) && !explanation.matchesVerdict)) {
    return null
  }

  let textColor = "text-white"
  let title = "AI-Generated Insights"
  if (!explanation.matchesVerdict) {
    // Change the appearance to make it more apparent this is shown only internally
    textColor = "text-gray-400"
    title = "Internal-only explanation"
  }

  function Description({ description }: { description: string }) {
    if (isLongDescription && !isExpanded) {
      return description.substring(0, MAX_DESCRIPTION_LENGTH) + "..."
    }
    return description
  }

  function ToggleDescriptionExpanded() {
    if (!isLongDescription) {
      return null
    }
    const more = (
      <span>
        More <FaChevronRight className="inline ml-1" />
      </span>
    )
    const less = (
      <span>
        Less <FaChevronDown className="inline ml-1" />
      </span>
    )
    return (
      <span onClick={() => setIsExpanded(!isExpanded)} className="text-blue-500 cursor-pointer">
        {isExpanded ? less : more}
      </span>
    )
  }

  return (
    <div className="col-span-1 xl:col-span-2">
      <Card className="h-full">
        <div>
          <div className={`text-left mb-2 ${textColor}`}>
            <div className="flex flex-row gap-2 items-center">
              <b>{title}</b>
            </div>
          </div>
        </div>
        <div className={`bg-gray-700 rounded-lg p-3 space-y-2 ${textColor}`}>
          <div className="mb-2">
            <Description description={explanation.description} />
          </div>

          {explanation.sourceUrl && (
            <>
              Background:{" "}
              <a className="underline" href={explanation.sourceUrl} target="_blank" rel="noopener noreferrer">
                {explanation.sourceUrl}
              </a>
            </>
          )}
        </div>

        <ToggleDescriptionExpanded />
      </Card>
    </div>
  )
}

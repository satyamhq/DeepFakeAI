import linkifyit from "linkify-it"

import { JoinedMedia } from "../../../data/media"
import { VerificationLabel } from "../VerificationBadge"
import TrueMediaLogo from "../../../components/TrueMediaLogo"
import { determineFake, meansHumanVerified } from "../../../data/groundTruth"
import { Card } from "flowbite-react"

const linkify = new linkifyit()

function ClickableLinksInText({ text }: { text: string }) {
  return (
    <div className="bg-gray-700 rounded-lg p-3 break-words">
      {text.split(/\s+/).map((word, index) => {
        return linkify.test(word) ? (
          <>
            <a
              key={index}
              href={word.startsWith("http") ? word : `https://${word}`}
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {word}
            </a>{" "}
          </>
        ) : (
          <span key={index}>{word} </span>
        )
      })}
    </div>
  )
}

export function HumanAnalysis({ media }: { media: JoinedMedia }) {
  // Card is only visible if media metadata has public comments.
  if (!media.meta?.comments) return null

  const comments = media.meta?.comments
  const groundTruth = determineFake(media)
  return (
    <div className="col-span-1">
      <Card className="h-full">
        <div className="space-y-4">
          {meansHumanVerified(groundTruth) && <VerificationLabel media={media} />}

          <div className="flex flex-row">
            <div className="flex items-center justify-center bg-purple-200 rounded-full h-9 w-9">
              <TrueMediaLogo className="brightness-0" size="xs" hasText={false} />
            </div>
            <div className="flex flex-col ml-2">
              <div>Human Analyst</div>
              <div className="text-gray-400">TrueMedia.org Notes</div>
            </div>
          </div>

          <ClickableLinksInText text={comments} />
        </div>
      </Card>
    </div>
  )
}

import DeepFakeAILogo from "./DeepFakeAILogo"
import { TailwindSize } from "./tailwindSize"

export default function TrueMediaLogo({
  size = "base",
  hasText = true,
  className = "",
}: {
  size?: TailwindSize
  hasText?: boolean
  className?: string
}) {
  return <DeepFakeAILogo size={size} hasText={hasText} className={className} />
}

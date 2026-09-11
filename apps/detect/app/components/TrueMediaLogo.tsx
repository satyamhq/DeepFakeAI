import { TailwindSize } from "./tailwindSize"

const sizeFileString: Record<TailwindSize, string> = {
  xs: "Xs",
  sm: "Sm",
  base: "Default",
  lg: "Lg",
  xl: "Xl",
}

export default function TrueMediaLogo({
  size = "base",
  hasText = true,
  className = "",
}: {
  size?: TailwindSize
  hasText?: boolean
  className?: string
}) {
  return <img className={className} src={`/logos/trueMediaLogo${hasText ? "Text" : ""}${sizeFileString[size]}.svg`} />
}

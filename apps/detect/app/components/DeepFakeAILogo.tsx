import { TailwindSize } from "./tailwindSize"

const sizeClasses: Record<TailwindSize, { text: string; badge: string }> = {
  xs: { text: "text-sm", badge: "text-[9px] px-1 py-0.2" },
  sm: { text: "text-base", badge: "text-[10px] px-1.5 py-0.5" },
  base: { text: "text-xl", badge: "text-xs px-1.5 py-0.5" },
  lg: { text: "text-2xl", badge: "text-sm px-2 py-0.5" },
  xl: { text: "text-3xl", badge: "text-base px-2.5 py-1" },
}

export default function DeepFakeAILogo({
  size = "base",
  hasText = true,
  className = "",
}: {
  size?: TailwindSize
  hasText?: boolean
  className?: string
}) {
  const currentSize = sizeClasses[size] || sizeClasses.base
  return (
    <span
      className={`inline-flex items-center gap-1 font-black tracking-tight select-none ${currentSize.text} ${className}`}
    >
      <span className="text-white">DeepFake</span>
      <span className={`bg-lime-500 text-slate-950 font-extrabold rounded-md uppercase tracking-wider ${currentSize.badge}`}>
        AI
      </span>
    </span>
  )
}

import { TailwindSize } from "./tailwindSize"

const baseStyles = "font-medium rounded-lg text-sm px-4 py-2 text-center text-nowrap"

const sizeStyles: Record<TailwindSize, string> = {
  xs: "px-2.5 py-1 text-xs",
  sm: "px-3 py-1.5 text-sm",
  base: "px-4 py-2 text-base",
  lg: "px-5 py-2.5 text-lg",
  xl: "px-6 py-3 text-xl",
}

export const RedButton = ({
  size = "base",
  isActive = false,
  onClick,
  className = "",
  children,
}: {
  size?: TailwindSize
  isActive?: boolean
  onClick?: () => void
  className?: string
  children: React.ReactNode
}) => {
  const bgColor = isActive ? "bg-red-900" : "bg-transparent"
  const textColor = isActive ? "text-white" : "text-red-500"
  const borderColor = isActive ? "border-red-800" : "border-red-500"

  return (
    <button
      type="button"
      className={`${className} ${sizeStyles[size]} ${baseStyles} ${bgColor} ${textColor} border ${borderColor} hover:text-white hover:bg-red-600 focus:ring-4 focus:outline-none focus:ring-red-900`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export const GreenButton = ({
  size = "base",
  isActive = false,
  onClick,
  className = "",
  children,
}: {
  size?: TailwindSize
  isActive?: boolean
  onClick?: () => void
  className?: string
  children: React.ReactNode
}) => {
  const bgColor = isActive ? "bg-green-700" : "bg-transparent"
  const textColor = isActive ? "text-white" : "text-green-500"
  const borderColor = isActive ? "border-green-600" : "border-green-500"

  return (
    <button
      type="button"
      className={`${className} ${sizeStyles[size]} ${baseStyles} ${bgColor} ${textColor} border ${borderColor} hover:text-white hover:bg-green-600 focus:ring-4 focus:outline-none focus:ring-green-800`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

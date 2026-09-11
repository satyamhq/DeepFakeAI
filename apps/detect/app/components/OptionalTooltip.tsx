import { Tooltip, TooltipProps } from "flowbite-react"

interface OptionalTooltipProps extends TooltipProps {
  children: React.ReactNode
}

const OptionalTooltip: React.FC<OptionalTooltipProps> = ({ children, content, ...rest }) => {
  if (!content) return children
  return (
    <Tooltip content={content} {...rest}>
      {children}
    </Tooltip>
  )
}

export default OptionalTooltip

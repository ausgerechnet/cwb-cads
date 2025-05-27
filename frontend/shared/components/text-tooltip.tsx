import { type ComponentProps, type ReactNode } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip'

export function TextTooltip({
  tooltipText,
  children,
  asChild,
  disableHoverableContent = true,
  side,
  delayDuration,
}: {
  tooltipText: ReactNode
  children: ReactNode
  asChild?: boolean
  disableHoverableContent?: boolean
  side?: ComponentProps<typeof TooltipContent>['side']
  delayDuration?: number
}) {
  return (
    <TooltipProvider
      disableHoverableContent={disableHoverableContent}
      delayDuration={delayDuration}
    >
      <Tooltip>
        <TooltipTrigger asChild={asChild}>{children}</TooltipTrigger>
        <TooltipContent side={side}>{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

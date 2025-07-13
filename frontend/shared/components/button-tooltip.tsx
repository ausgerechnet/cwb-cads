import { ComponentProps, ReactNode } from 'react'
import { Button } from './button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip'

export function ButtonTooltip({
  tooltip,
  side,
  disableHoverableContent = true,
  ...props
}: ComponentProps<typeof Button> & {
  tooltip: ReactNode
  side?: ComponentProps<typeof TooltipContent>['side']
  disableHoverableContent?: boolean
}) {
  return (
    <TooltipProvider disableHoverableContent={disableHoverableContent}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button {...props} />
        </TooltipTrigger>
        <TooltipContent side={side}>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

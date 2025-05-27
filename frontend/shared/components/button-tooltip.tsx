import { ComponentProps, ReactNode } from 'react'
import { Button } from './ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip'

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

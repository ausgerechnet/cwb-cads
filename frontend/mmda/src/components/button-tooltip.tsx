import { ComponentProps, ReactNode } from 'react'
import { Button } from '@cads/shared/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@cads/shared/components/ui/tooltip'

export function ButtonTooltip({
  tooltip,
  side,
  ...props
}: ComponentProps<typeof Button> & {
  tooltip: ReactNode
  side?: ComponentProps<typeof TooltipContent>['side']
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button {...props} />
        </TooltipTrigger>
        <TooltipContent side={side}>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

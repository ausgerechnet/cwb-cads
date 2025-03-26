import { type ReactNode } from 'react'
import { MoreVertical } from 'lucide-react'

import { cn } from '../lib/utils'
import { buttonVariants } from './ui/button'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

export function QuickActions({ children }: { children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          '-my-3',
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <MoreVertical className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent
        className="flex flex-col gap-2"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}

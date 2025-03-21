import { useMutation } from '@tanstack/react-query'
import { Loader2Icon, ShuffleIcon } from 'lucide-react'

import { cn } from '@cads/shared/lib/utils'
import { shuffleQueryConcordances } from '@cads/shared/queries'
import { Button } from '@cads/shared/components/ui/button'
import {
  ContextBreakInput,
  FilterItemInput,
  PrimaryInput,
  SecondaryInput,
  SortByOffsetInput,
  SortOrderInput,
  WindowSizeInput,
} from '@cads/shared/components/concordances'

export function QueryFilter({
  queryId,
  className,
}: {
  queryId: number
  className?: string
}) {
  const { mutate: shuffle, isPending: isShuffling } = useMutation(
    shuffleQueryConcordances,
  )

  return (
    <div className={cn('mb-8 grid grid-cols-8 gap-2', className)}>
      <WindowSizeInput />
      <SortByOffsetInput />
      <SortOrderInput />
      <ContextBreakInput />
      <FilterItemInput />
      <PrimaryInput />
      <SecondaryInput />

      <Button
        className="mt-auto"
        onClick={() => {
          shuffle(queryId)
        }}
        disabled={isShuffling}
      >
        {isShuffling ? (
          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ShuffleIcon className="mr-2 h-4 w-4" />
        )}
        Shuffle
      </Button>
    </div>
  )
}

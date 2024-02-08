import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { z } from 'zod'

import { cn } from '@/lib/utils'
import { schemas } from '@/rest-client'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import { ScrollArea } from '@/components/ui/scroll-area'

export function QuerySelect({
  queries,
  queryId,
  onChange,
  className,
}: {
  queries: z.infer<typeof schemas.QueryOut>[]
  queryId?: number
  onChange?: (corpusId: number) => void
  className?: string
}) {
  const searchableQueries = useMemo(
    () =>
      queries
        .filter(({ id }) => id !== undefined)
        .map((query) => ({
          ...query,
          searchValue:
            `${query.id}_${query}_${query.corpus?.cwb_id}_${query.nqr_name}`
              .toLowerCase()
              .replace(/\s+/g, '_'),
        })),
    [queries],
  )
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('flex justify-between', className)}
          name="corpus"
          value={queryId?.toString()}
        >
          {queryId === undefined
            ? 'Select a query'
            : searchableQueries.find(({ id }) => id === queryId)?.id ?? ''}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-w-96 p-0">
        <Command>
          <CommandInput placeholder="Search corpus..." />
          <CommandEmpty>No corpus found.</CommandEmpty>
          <CommandGroup>
            <ScrollArea className="h-80 max-h-[30svh]">
              {searchableQueries.map(({ searchValue, id, corpus }) => {
                if (id === undefined) {
                  return null
                }
                return (
                  <CommandItem
                    key={id}
                    value={searchValue}
                    onSelect={() => {
                      onChange?.(id)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        id === queryId ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {id}
                    {corpus && <>({corpus.cwb_id})</>}
                  </CommandItem>
                )
              })}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

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

export function DiscoursemeSelect({
  discoursemes,
  discoursemeId,
  onChange,
  className,
}: {
  discoursemes: z.infer<typeof schemas.DiscoursemeOut>[]
  discoursemeId?: number
  onChange?: (corpusId: number) => void
  className?: string
}) {
  const searchableQueries = useMemo(
    () =>
      discoursemes
        .filter(({ id }) => id !== undefined)
        .map((discoursemes) => ({
          ...discoursemes,
          searchValue: `${discoursemes.id}_${
            discoursemes.description
          }_${discoursemes._items?.join('_')}`
            .toLowerCase()
            .replace(/\s+/g, '_'),
        })),
    [discoursemes],
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
          value={discoursemeId?.toString()}
        >
          {discoursemeId === undefined
            ? 'Select a query'
            : searchableQueries.find(({ id }) => id === discoursemeId)?.id ??
              ''}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-w-96 p-0">
        <Command>
          <CommandInput placeholder="Search corpus..." />
          <CommandEmpty>No corpus found.</CommandEmpty>
          <CommandGroup>
            <ScrollArea className="h-80 max-h-[30svh]">
              {searchableQueries.map(
                ({ searchValue, id, description, _items }) => {
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
                          id === discoursemeId ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      {id} {description} {_items && <>({_items.join(', ')})</>}
                    </CommandItem>
                  )
                },
              )}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

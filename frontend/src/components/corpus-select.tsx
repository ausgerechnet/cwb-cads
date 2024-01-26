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
import { Small } from '@/components/ui/typography'

export function CorpusSelect({
  corpora,
  corpusId,
  onChange,
  className,
}: {
  corpora: z.infer<typeof schemas.CorpusOut>[]
  corpusId?: number
  onChange?: (corpusId: number) => void
  className?: string
}) {
  const searchableCorpora = useMemo(
    () =>
      corpora
        .filter(
          ({ cwb_id, name }) => cwb_id !== undefined && name !== undefined,
        )
        .map((corpus) => ({
          ...corpus,
          searchValue: `${corpus.cwb_id} ${corpus.name} ${corpus.description}`
            .toLowerCase()
            .replace(/\s+/g, '_'),
        })),
    [corpora],
  )
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('flex justify-between', className)}
          name="corpus"
          value={corpusId?.toString()}
        >
          {corpusId === undefined
            ? 'Select a corpus'
            : searchableCorpora.find(({ id }) => id === corpusId)?.name ?? ''}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search corpus..." />
          <CommandEmpty>No corpus found.</CommandEmpty>
          <CommandGroup>
            {searchableCorpora.map(
              ({ searchValue, id, cwb_id, name, description }) => {
                if (cwb_id === undefined || id === undefined) {
                  return null
                }
                return (
                  <CommandItem
                    key={cwb_id}
                    value={searchValue}
                    onSelect={() => {
                      onChange?.(id)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        id === corpusId ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {name}
                    <div>
                      {description && (
                        <Small className="block text-muted-foreground">
                          {description}
                        </Small>
                      )}
                    </div>
                  </CommandItem>
                )
              },
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

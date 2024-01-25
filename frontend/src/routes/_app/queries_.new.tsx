import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronsUpDown } from 'lucide-react'
import { Link, FileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { schemas } from '@/rest-client'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import { navigationMenuTriggerStyle } from '@/components/ui/navigation-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Headline1, Small } from '@/components/ui/typography'
import { corporaQueryOptions } from '@/data/queries'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const Route = new FileRoute('/_app/queries/new').createRoute({
  component: QueriesNew,
  validateSearch: z.object({
    cqpMode: z.boolean().optional(),
  }),
  loader: async ({ context: { queryClient } }) => {
    const corpora = await queryClient.ensureQueryData(corporaQueryOptions)
    return { corpora }
  },
})

function QueriesNew() {
  const { corpora } = Route.useLoaderData()
  const { cqpMode = false } = Route.useSearch()
  const navigate = useNavigate()

  return (
    <div className="p-2">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          console.log(new FormData(event.currentTarget))
        }}
      >
        <Link to="/queries" className={navigationMenuTriggerStyle()}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Queries
        </Link>
        <Headline1 className="mb-8">New Query</Headline1>

        <CorpusSelection corpora={corpora} />

        <Label className="align-center mt-4 flex items-center justify-start gap-3">
          <Switch
            checked={cqpMode}
            onCheckedChange={(cqpMode) => {
              navigate({ search: { cqpMode }, replace: true })
            }}
          />
          <span>CQP Query manuell eingeben</span>
        </Label>

        {cqpMode ? (
          <>
            <Label htmlFor="cqpQuery" className="mt-4">
              CQP Query
            </Label>
            <Textarea name="gcpQuery" id="gcpQuery" />

            <Label htmlFor="matchStrategy" className="mt-4">
              Match strategy
            </Label>
            <Select name="matchStrategy">
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Match strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="shortest">Shortest</SelectItem>
                  <SelectItem value="longest">Longest</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="traditional">Traditional</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Label htmlFor="contextBreak" className="mt-4">
              Context Break
            </Label>
            <Select name="contextBreak">
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Context Break" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="p">Paragraph</SelectItem>
                  <SelectItem value="s">Sentence</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </>
        ) : (
          <>Easy mode goes here</>
        )}
        <Button type="submit">Create Query</Button>
      </form>
    </div>
  )
}

function CorpusSelection({
  corpora,
}: {
  corpora: z.infer<typeof schemas.CorpusOut>[]
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
  const [corpusId, setCorpusId] = useState<number | undefined>(undefined)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-80 justify-between"
          name="corpus"
          value={corpusId?.toString()}
        >
          {corpusId === undefined
            ? 'Select a corpus'
            : searchableCorpora.find(({ id }) => id === corpusId)?.name ?? ''}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
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
                      setCorpusId(id)
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

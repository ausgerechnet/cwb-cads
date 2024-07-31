import { useSuspenseQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { z } from 'zod'

import { discoursemesQueryOptions } from '@/lib/queries'
import { schemas } from '@/rest-client'
import { Small } from './ui/typography'
import { Button } from './ui/button'
import { DiscoursemeSelect } from './select-discourseme'

export function DiscoursemeListSelect({
  discoursemeIds = [],
  onChange,
  selectableDiscoursemes,
}: {
  discoursemeIds?: number[]
  selectableDiscoursemes: z.infer<typeof schemas.DiscoursemeOut>[]
  onChange: (ids: number[]) => void
}) {
  const { data: discoursemes } = useSuspenseQuery(discoursemesQueryOptions)
  const selectedDiscoursemes = discoursemes.filter(
    ({ id }) => id !== undefined && discoursemeIds.includes(id),
  )

  const handleDelete = (id: number) => {
    onChange(discoursemeIds.filter((i) => i !== id))
  }

  return (
    <div className="flex flex-col gap-2">
      {selectedDiscoursemes.map((discourseme) => (
        <div
          key={discourseme.id}
          className="flex gap-x-4 rounded-md border border-input py-2 pl-4 pr-1 ring-ring ring-offset-2 focus-within:ring-2"
        >
          <Small className="mx-0 my-auto flex-grow">
            {discourseme.name}
            <span className="mt-1 block text-muted-foreground">
              {discourseme.comment}
            </span>
          </Small>
          <Button
            onClick={() => handleDelete(discourseme.id!)}
            variant="ghost"
            type="button"
            size="icon"
            className="min-h-min min-w-min flex-shrink-0 self-center p-2 focus:ring-0 focus-visible:ring-0 focus-visible:ring-transparent"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <DiscoursemeSelect
        className="flex-grow"
        discoursemes={selectableDiscoursemes}
        discoursemeId={undefined}
        undefinedName="Select a discourseme to add…"
        onChange={(selectedId) => {
          if (selectedId !== undefined) {
            onChange([...discoursemeIds, selectedId])
          }
        }}
      />
    </div>
  )
}

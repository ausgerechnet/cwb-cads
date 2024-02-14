import { useMemo } from 'react'
import { z } from 'zod'

import { schemas } from '@/rest-client'
import { ComplexSelect } from '@/components/select-complex'

export function DiscoursemeSelect({
  discoursemes = [],
  discoursemeId,
  onChange,
  className,
  undefinedName = 'No Discourseme Selected',
}: {
  discoursemes: z.infer<typeof schemas.DiscoursemeOut>[]
  discoursemeId?: number
  onChange?: (discoursemeId: number | undefined) => void
  className?: string
  undefinedName?: string
}) {
  const searchableItems = useMemo(
    () => [
      {
        id: undefined,
        name: undefinedName,
        searchValue: 'no_empty_nothing',
        renderValue: <span className="italic">No discourseme</span>,
      },
      ...discoursemes
        .filter(({ id }) => id !== undefined)
        .map((discourseme) => ({
          id: discourseme.id as number,
          name: discourseme.name ?? '',
          searchValue: `${discourseme.id} ${discourseme.name} ${
            discourseme._items?.join(' ') ?? ''
          }`
            .toLowerCase()
            .replace(/\s+/g, '_'),
          renderValue: <span>{discourseme.name}</span>,
        })),
    ],
    [discoursemes, undefinedName],
  )

  return (
    <ComplexSelect
      selectMessage="Select a discourseme"
      placeholder="Search for a discourseme..."
      emptyMessage="No discourseme found."
      items={searchableItems}
      itemId={discoursemeId}
      onChange={onChange}
      className={className}
    />
  )
}

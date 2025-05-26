import { useMemo } from 'react'
import { z } from 'zod'

import { ComplexSelect } from './select-complex'
import { schemas } from '../api-client'

export function DiscoursemeSelect({
  discoursemes = [],
  discoursemeId,
  onChange,
  className,
  disabled,
  undefinedName = 'No Discourseme Selected',
  selectMessage = 'Select a discourseme',
  placeholder = 'Search for a discourseme...',
  emptyMessage = 'No discourseme found.',
}: {
  discoursemes: z.infer<typeof schemas.DiscoursemeOut>[]
  disabled?: boolean
  discoursemeId?: number
  onChange?: (discoursemeId: number | undefined) => void
  className?: string
  undefinedName?: string
  selectMessage?: string
  placeholder?: string
  emptyMessage?: string
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
        .map(({ id, template, name }) => ({
          id: id as number,
          name: name ?? '',
          searchValue: `${id} ${name} ${
            (template ?? []).map((item) => item.surface).join(' ') ?? ''
          }`
            .toLowerCase()
            .slice(0, 200)
            .replace(/\s+/g, '_'),
          renderValue: <span>{name}</span>,
        })),
    ],
    [discoursemes, undefinedName],
  )

  return (
    <ComplexSelect
      selectMessage={selectMessage}
      placeholder={placeholder}
      emptyMessage={emptyMessage}
      disabled={disabled}
      items={searchableItems}
      itemId={discoursemeId}
      onChange={onChange}
      className={className}
    />
  )
}

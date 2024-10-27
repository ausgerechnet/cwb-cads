import { useMemo } from 'react'
import { z } from 'zod'

import { schemas } from '@/rest-client'
import { ComplexSelect } from '@cads/shared/components/select-complex'

export function QuerySelect({
  queries,
  queryId,
  onChange,
  className,
}: {
  queries: z.infer<typeof schemas.QueryOut>[]
  queryId?: number
  onChange?: (corpusId: number | undefined) => void
  className?: string
}) {
  const searchableQueries = useMemo(
    () => [
      {
        id: undefined,
        name: 'No Query Selected',
        searchValue: 'none_empty_nothing',
        renderValue: <span className="italic">None</span>,
      },
      ...queries
        .filter(({ id }) => id !== undefined)
        .map((query) => ({
          id: query.id!,
          name: `${query.id}_${query.corpus_id}_${query.corpus_name}_${query.subcorpus_name}_${query.subcorpus_id}`
            .toLowerCase()
            .replace(/\s+/g, '_'),
          searchValue:
            `${query.id}_${query.corpus_id}_${query.corpus_name}_${query.subcorpus_name}_${query.subcorpus_id}`
              .toLowerCase()
              .replace(/\s+/g, '_'),
        })),
    ],
    [queries],
  )

  return (
    <ComplexSelect
      itemId={queryId}
      onChange={onChange}
      items={searchableQueries}
      className={className}
    />
  )
}

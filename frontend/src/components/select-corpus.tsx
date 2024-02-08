import { useMemo } from 'react'
import { z } from 'zod'

import { schemas } from '@/rest-client'
import { ComplexSelect } from '@/components/select-complex'

export function CorpusSelect({
  corpora,
  corpusId,
  onChange,
  className,
}: {
  corpora: z.infer<typeof schemas.CorpusOut>[]
  corpusId?: number
  onChange?: (corpusId: number | undefined) => void
  className?: string
}) {
  const searchableCorpora = useMemo(
    () => [
      {
        id: undefined,
        name: 'No Corpus Selected',
        searchValue: 'no_empty_nothing',
        renderValue: <span className="italic">No corpus</span>,
      },
      ...corpora
        .filter(
          ({ cwb_id, name, id }) =>
            id !== undefined && cwb_id !== undefined && name !== undefined,
        )
        .map((corpus) => ({
          id: corpus.id as number,
          name: corpus.name ?? '',
          searchValue: `${corpus.cwb_id} ${corpus.name} ${corpus.description}`
            .toLowerCase()
            .replace(/\s+/g, '_'),
        })),
    ],
    [corpora],
  )

  return (
    <ComplexSelect
      selectMessage="Select a corpus"
      placeholder="Search for a corpus..."
      emptyMessage="No corpora found."
      items={searchableCorpora}
      itemId={corpusId}
      onChange={onChange}
      className={className}
    />
  )
}

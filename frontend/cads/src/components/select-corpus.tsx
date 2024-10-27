import { useMemo } from 'react'
import { z } from 'zod'

import { schemas } from '@/rest-client'
import { ComplexSelect } from '@cads/shared/components/select-complex'

export function CorpusSelect({
  corpora,
  corpusId,
  onChange,
  className,
  disabled,
}: {
  corpora: (Pick<
    z.infer<typeof schemas.CorpusOut>,
    'id' | 'name' | 'description'
  > &
    Partial<
      Pick<z.infer<typeof schemas.SubCorpusOut>, 'nqr_cqp'> &
        Pick<z.infer<typeof schemas.CorpusOut>, 'cwb_id'>
    >)[]
  corpusId?: number
  onChange?: (corpusId: number | undefined) => void
  className?: string
  disabled?: boolean
}) {
  const searchableCorpora = useMemo(
    () => [
      {
        id: undefined,
        name: 'No Corpus Selected',
        searchValue: 'no_empty_nothing',
        renderValue: <span className="italic">No corpus</span>,
      },
      ...corpora.map((corpus) => ({
        id: corpus.id,
        name: corpus.name ?? '',
        searchValue: `${corpus?.cwb_id ?? corpus?.nqr_cqp ?? ''} ${
          corpus.name ?? ''
        } ${corpus.description ?? ''}`
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
      disabled={disabled}
    />
  )
}

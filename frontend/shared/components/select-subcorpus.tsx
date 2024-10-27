import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { corpusList, subcorporaList } from '@cads/shared/queries'
import { ComplexSelect } from './select-complex'
import { ErrorMessage } from './error-message'

/**
 * Select a corpus or subcorpus from a list of corpora and subcorpora.
 */
export function SelectSubcorpus({
  corpusId,
  subcorpusId,
  onChange,
  className,
  disabled,
}: {
  corpusId?: number
  subcorpusId?: number
  onChange: (corpusId?: number, subcorpusId?: number) => void
  className?: string
  disabled?: boolean
}) {
  const { data: corpora, isLoading: isLoadingCorpora } = useQuery(corpusList)
  const { data: subcorpora, isLoading: isLoadingSubcorpora } =
    useQuery(subcorporaList)
  const isLoading = isLoadingCorpora || isLoadingSubcorpora

  const [searchableCorpora, idMap] = useMemo(() => {
    const idMap = new Map<
      string | undefined,
      { corpusId?: number; subcorpusId?: number }
    >()
    if (!corpora || !subcorpora) return [[], idMap]
    const searchableCorpora = [
      {
        id: undefined,
        corpusId: undefined,
        subcorpusId: undefined,
        name: 'No Corpus/Subcorpus Selected',
        searchValue: 'no_empty_nothing',
        renderValue: <span className="italic">No corpus</span>,
      },
      ...corpora
        .map((corpus) => [
          {
            id: `corpus:${corpus.id}`,
            corpusId: corpus.id,
            subcorpusId: undefined,
            name: corpus.name ?? '',
            searchValue: `${corpus.name ?? ''} ${corpus.description ?? ''}`
              .toLowerCase()
              .replace(/\s+/g, '_'),
          },
          ...subcorpora
            .filter((subcorpus) => subcorpus.corpus.id === corpus.id)
            .map((subcorpus) => ({
              id: `subcorpus:${subcorpus.id}`,
              corpusId: corpus.id,
              subcorpusId: subcorpus.id,
              name: `${corpus.name}: ${subcorpus.name}`,
              renderValue: (
                <span>
                  <span className="text-muted-foreground">{corpus.name}</span>{' '}
                  {subcorpus.name}
                </span>
              ),
              searchValue: `${corpus.name ?? ''} ${corpus.description ?? ''}_${
                subcorpus.name ?? ''
              } ${subcorpus.description}`.toLowerCase(),
            })),
        ])
        .flat(),
    ]
    searchableCorpora.forEach(({ id, corpusId, subcorpusId }) => {
      idMap.set(id, { corpusId, subcorpusId })
    })

    return [searchableCorpora, idMap]
  }, [corpora, subcorpora])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!corpora || !subcorpora) {
    return <ErrorMessage error={new Error('Corpora or subcorpora not found')} />
  }

  const itemId =
    corpusId === undefined
      ? undefined
      : subcorpusId === undefined
        ? `corpus:${corpusId}`
        : `subcorpus:${subcorpusId}`

  return (
    <ComplexSelect
      selectMessage="Select a corpus/subcorpus"
      placeholder="Search for a corpus/subcorpus..."
      emptyMessage="No corpora/subcorpora found."
      items={searchableCorpora!}
      itemId={itemId}
      onChange={(id) => {
        const { corpusId, subcorpusId } = idMap!.get(id) ?? {}
        if (subcorpusId !== undefined && corpusId === undefined) {
          throw new Error('Subcorpus ID without corpus ID')
        }
        onChange(corpusId, subcorpusId)
      }}
      className={className}
      disabled={disabled}
    />
  )
}

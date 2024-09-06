import { useMemo } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { ArrowLeftIcon, Loader2Icon } from 'lucide-react'
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import {
  addConstellationDiscourseme,
  constellationById,
  constellationDescriptionFor,
  deleteConstellationDiscourseme,
  discoursemesList,
} from '@/lib/queries'
import { buttonVariants } from '@/components/ui/button'
import WordCloud, { Word } from '@/components/word-cloud'
import { ErrorMessage } from '@/components/error-message'
import { useDescription } from './-use-description'
import { useCollocation } from './-use-collocation'
import { useFilterSelection } from './-use-filter-selection'
import { DiscoursemeSelect } from '../../../../components/select-discourseme'

const COORDINATES_SCALE_FACTOR = 20

export function SemanticMap({ constellationId }: { constellationId: number }) {
  const { description } = useDescription()
  const { collocationItems, isLoading } = useCollocation(
    constellationId,
    description?.id,
    description?.corpus_id,
  )

  const words = useMemo(
    () =>
      (collocationItems?.coordinates ?? []).map(
        (item): Word => ({
          id: item.item,
          word: item.item,
          x: (item.x_user ?? item.x) * COORDINATES_SCALE_FACTOR,
          y: (item.y_user ?? item.y) * COORDINATES_SCALE_FACTOR,
          originX: (item.x_user ?? item.x) * COORDINATES_SCALE_FACTOR,
          originY: (item.y_user ?? item.y) * COORDINATES_SCALE_FACTOR,
          significance: 0.5,
          radius: 20,
        }),
      ),
    [collocationItems?.coordinates],
  )

  return (
    <div className="-mx-2 flex-grow bg-muted">
      <Link
        to="/constellations/$constellationId"
        from="/constellations/$constellationId/semantic-map"
        params={{ constellationId: constellationId.toString() }}
        search={(s) => s}
        className={cn(
          buttonVariants({ variant: 'link' }),
          'top-42 absolute right-2 z-10 px-2',
        )}
      >
        <ArrowLeftIcon />
      </Link>
      <ConstellationDiscoursemesEditor constellationId={constellationId} />
      {isLoading && <Loader2Icon className="h-6 w-6 animate-spin" />}
      <WordCloud words={words} />
    </div>
  )
}

function ConstellationDiscoursemesEditor({
  constellationId,
}: {
  constellationId: number
}) {
  const { corpusId } = useSearch({
    from: '/_app/constellations/$constellationId',
  })
  if (corpusId === undefined) throw new Error('corpusId is undefined')
  const { s } = useFilterSelection(
    '/_app/constellations/$constellationId',
    corpusId,
  )
  const {
    data: { discoursemes },
  } = useSuspenseQuery(constellationById(constellationId))
  const { data: allDiscoursemes } = useSuspenseQuery(discoursemesList)
  const { data: constellationDescription, error } = useQuery(
    constellationDescriptionFor({
      constellationId,
      corpusId,
      subcorpusId: null,
      matchStrategy: 'longest',
      s,
    }),
  )
  const {
    mutate: addDiscourseme,
    isPending,
    error: errorAddDiscourseme,
  } = useMutation(addConstellationDiscourseme)
  const {
    mutate: deleteDiscourseme,
    isPending: isDeleting,
    error: errorDeleteDiscourseme,
  } = useMutation(deleteConstellationDiscourseme)
  console.log('constellation description', constellationDescription)
  return (
    <div>
      <ErrorMessage error={error} />
      <ErrorMessage error={errorDeleteDiscourseme} />
      {discoursemes.map((discourseme) => (
        <div>
          {discourseme.id} {discourseme.name}
          <button
            disabled={isDeleting}
            className="bg-red-500 p-1"
            onClick={() =>
              deleteDiscourseme({
                constellationId,
                discoursemeId: discourseme.id,
              })
            }
          >
            Delete
          </button>
        </div>
      ))}
      <ErrorMessage error={errorAddDiscourseme} />
      <DiscoursemeSelect
        disabled={isPending}
        discoursemes={allDiscoursemes}
        onChange={(discoursemeId) => {
          if (discoursemeId === undefined) return
          addDiscourseme({
            constellationId,
            discoursemeId,
          })
        }}
      />
    </div>
  )
}

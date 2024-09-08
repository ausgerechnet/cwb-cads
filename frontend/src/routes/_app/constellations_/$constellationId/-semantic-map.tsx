import { useMemo } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { ArrowLeftIcon, Loader2Icon } from 'lucide-react'
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import {
  addConstellationDiscourseme,
  constellationById,
  constellationDescriptionFor,
  removeConstellationDiscourseme,
  discoursemesList,
  addDescriptionItem,
  removeDescriptionItem,
} from '@/lib/queries'
import { buttonVariants } from '@/components/ui/button'
import WordCloud, { Word } from '@/components/word-cloud'
import { ErrorMessage } from '@/components/error-message'
import { DiscoursemeSelect } from '@/components/select-discourseme'
import { ComplexSelect } from '@/components/select-complex'
import { useDescription } from './-use-description'
import { useCollocation } from './-use-collocation'
import { useFilterSelection } from './-use-filter-selection'

const COORDINATES_SCALE_FACTOR = 40

export function SemanticMap({ constellationId }: { constellationId: number }) {
  const { description } = useDescription()
  const { collocationItemsMap, isLoading } = useCollocation(
    constellationId,
    description?.id,
    description?.corpus_id,
  )

  const words = useMemo(
    () =>
      (collocationItemsMap?.coordinates ?? []).map(
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
    [collocationItemsMap],
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
      <div className="bg-blue-200">
        <WordCloud words={words} />
      </div>
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
    mutate: removeDiscourseme,
    isPending: isRemovingDiscourseme,
    error: errorDeleteDiscourseme,
  } = useMutation(removeConstellationDiscourseme)
  const {
    mutate: removeItem,
    isPending: isRemovingItem,
    error: errorRemoveItem,
  } = useMutation(removeDescriptionItem)
  console.log('constellation description', constellationDescription)
  return (
    <div>
      Constellation Description Id: {constellationDescription?.id}
      <br />
      <ErrorMessage error={error} />
      <ErrorMessage error={errorDeleteDiscourseme} />
      <ErrorMessage error={errorRemoveItem} />
      {constellationDescription?.discourseme_descriptions.map(
        (discoursemeDescription) => (
          <div key={discoursemeDescription.id}>
            {discoursemeDescription.id}{' '}
            {
              discoursemes.find(
                ({ id }) => id === discoursemeDescription.discourseme_id,
              )?.name
            }
            <button
              disabled={isRemovingDiscourseme}
              className="bg-red-500 p-1"
              onClick={() =>
                removeDiscourseme({
                  constellationId,
                  discoursemeId: discoursemeDescription.discourseme_id,
                })
              }
            >
              Delete
              {/*  TODO: Handle case when this is the filter discourseme*/}
            </button>
            <ul>
              {discoursemeDescription.items.map((item) => (
                <li key={item.surface}>
                  {item.surface}
                  <button
                    className="my-0.5 ml-1 rounded bg-red-500 p-1 py-0"
                    onClick={() =>
                      removeItem({
                        discoursemeId: discoursemeDescription.discourseme_id,
                        descriptionId: discoursemeDescription.id,
                        // cqpQuery: item.cqp_query,
                        p: item.p!,
                        surface: item.surface!,
                      })
                    }
                    disabled={isRemovingItem}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
            <AddDescriptionItem
              constellationId={constellationId}
              discoursemeId={discoursemeDescription.discourseme_id}
              discoursemeDescriptionId={discoursemeDescription.id}
            />
          </div>
        ),
      )}
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

function AddDescriptionItem({
  discoursemeDescriptionId,
  discoursemeId,
  constellationId,
}: {
  discoursemeDescriptionId: number
  discoursemeId: number
  constellationId: number
}) {
  const {
    mutate: addItem,
    isPending: isAddingItem,
    error: errorAddItem,
  } = useMutation(addDescriptionItem)
  const { corpusId } = useSearch({
    from: '/_app/constellations/$constellationId',
  })
  const { secondary } = useFilterSelection(
    '/_app/constellations/$constellationId',
    corpusId,
  )
  const { description } = useDescription()
  const { collocationItemsMap } = useCollocation(
    constellationId,
    description?.id,
    description?.corpus_id,
  )
  const collocationItems = useMemo(
    () =>
      (collocationItemsMap?.items ?? []).map(({ item }, id) => ({
        id,
        name: item,
        searchValue: item,
      })),
    [collocationItemsMap],
  )

  return (
    <>
      <ErrorMessage error={errorAddItem} />
      <ComplexSelect
        disabled={isAddingItem}
        items={collocationItems}
        onChange={(itemIndex) => {
          if (itemIndex === undefined) return
          const surface = collocationItemsMap?.items[itemIndex]?.item
          if (surface === undefined || secondary === undefined) {
            console.warn('Could not add item, missing values', {
              surface,
              secondary,
            })
            return
          }
          console.log('selected surface', surface)
          addItem({
            discoursemeId,
            descriptionId: discoursemeDescriptionId,
            // TODO: Where to get this from?
            cqpQuery: `[${secondary}="${surface}"]`,
            surface: surface,
            p: secondary,
          })
        }}
      />
    </>
  )
}

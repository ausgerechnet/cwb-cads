import { useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { cn } from '@cads/shared/lib/utils'
import { clamp } from '@cads/shared/lib/clamp'
import {
  putSemanticMapCoordinates,
  addDescriptionItem,
  createDiscoursemeForConstellationDescription,
} from '@cads/shared/queries'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { LoaderBig } from '@cads/shared/components/loader-big'
import {
  WordCloud,
  type WordCloudWordIn,
  type WordCloudDiscoursemeIn,
  type WordCloudEvent,
} from '@/components/word-cloud'
import { useConcordanceFilterContext } from '@cads/shared/components/concordances'

import { useFilterSelection } from './-use-filter-selection'
import { ConstellationCollocationFilter } from './-constellation-filter'
import { useUfa } from './-use-ufa'
import { ConstellationDiscoursemesEditor } from './-constellation-discoursemes-editor'

export function SemanticMapUfa({
  constellationId,
}: {
  constellationId: number
}) {
  const {
    setDiscoursemeIds,
    clFilterDiscoursemeIds,
    clFilterItem,
    setFilterItem,
  } = useConcordanceFilterContext()
  // TODO: unify! Only these lines differ from SemanticMapCollocations
  const { secondary } = useFilterSelection(
    '/_app/constellations_/$constellationId',
  )
  const {
    mapItems,
    errors: errorCollocation,
    isFetching,
    description,
  } = useUfa()
  // -----
  const wordsInput =
    mapItems?.map
      ?.filter((item) => item.source === 'items')
      .map(
        (item): WordCloudWordIn => ({
          x: item.x,
          y: item.y,
          label: item.item,
          score: clamp(item.scaled_score, 0, 1),
        }),
      ) ?? []
  const discoursemesInput =
    mapItems?.map
      ?.filter(
        (item) =>
          item.source === 'discoursemes' &&
          typeof item.discourseme_id === 'number',
      )
      .map(
        (item): WordCloudDiscoursemeIn => ({
          x: item.x,
          y: item.y,
          label: item.item,
          discoursemeId: item.discourseme_id!,
          score: clamp(item.scaled_score, 0, 1),
        }),
      ) ?? []
  const { mutate: updateCoordinates } = useMutation(putSemanticMapCoordinates)

  const semantic_map_id = mapItems?.semantic_map_id

  const { mutate: postNewDiscourseme, error: errorNewDiscourseme } =
    useMutation({
      ...createDiscoursemeForConstellationDescription,
      onError: (...args) => {
        createDiscoursemeForConstellationDescription.onError?.(...args)
        toast.error('Failed to create discourseme')
      },
      onSuccess: (data, ...rest) => {
        createDiscoursemeForConstellationDescription.onSuccess?.(data, ...rest)
        toast.success('Discourseme created and attached')
      },
    })
  const { mutate: addItem, error: errorAddItem } = useMutation({
    ...addDescriptionItem,
    onError: (...args) => {
      addDescriptionItem.onError?.(...args)
      toast.error('Failed to add surface to disourseme description')
    },
    onSuccess: (data, ...rest) => {
      addDescriptionItem.onSuccess?.(data, ...rest)
      toast.success('Surface successfully added')
    },
  })

  const onNewDiscourseme = useCallback(
    (surfaces: string[]) => {
      if (!description || !secondary) return
      postNewDiscourseme({
        surfaces,
        constellationId,
        constellationDescriptionId: description.id,
        p: secondary,
        name: surfaces.join(' ').substring(0, 25),
      })
    },
    [constellationId, description, postNewDiscourseme, secondary],
  )

  const onUpdateDiscourseme = useCallback(
    (discoursemeId: number, surface: string) => {
      const descriptionId = description?.discourseme_descriptions.find(
        ({ id }) => id === discoursemeId,
      )?.id
      if (descriptionId === undefined) {
        throw new Error(
          `No discourseme description found for discourseme id ${descriptionId}`,
        )
      }
      addItem({
        discoursemeId,
        descriptionId,
        surface,
        p: secondary!,
      })
    },
    [addItem, description?.discourseme_descriptions, secondary],
  )

  const handleCloudChange = (event: WordCloudEvent) => {
    switch (event.type) {
      case 'new_discourseme': {
        const { surfaces } = event
        onNewDiscourseme(surfaces)
        break
      }
      case 'add_to_discourseme': {
        const { discoursemeId, surface } = event
        onUpdateDiscourseme(discoursemeId, surface)
        break
      }
      case 'update_surface_position': {
        if (semantic_map_id === undefined || semantic_map_id === null) return
        updateCoordinates({
          semanticMapId: semantic_map_id,
          item: event.surface,
          x_user: event.x,
          y_user: event.y,
        })
        break
      }
      case 'set_filter_item': {
        setFilterItem(event.item ?? undefined, secondary)
        break
      }
      case 'set_filter_discourseme_ids': {
        setDiscoursemeIds(event.discoursemeIds)
        break
      }
    }
  }

  return (
    <div className="group/map bg-muted/50 grid h-[calc(100svh-3.5rem)] flex-grow grid-cols-[1rem_1fr_25rem_1rem] grid-rows-[1rem_auto_1fr_4rem] gap-5 overflow-hidden">
      {semantic_map_id !== undefined &&
        semantic_map_id !== null &&
        Boolean(mapItems) && (
          <WordCloud
            className={cn(
              'z-0 col-start-2 row-start-3 self-stretch justify-self-stretch',
              { 'pointer-events-none opacity-50': isFetching },
            )}
            words={wordsInput}
            discoursemes={discoursemesInput}
            filterDiscoursemeIds={clFilterDiscoursemeIds}
            filterItem={clFilterItem}
            cutOff={0}
            onChange={handleCloudChange}
          />
        )}

      <div className="relative col-span-2 col-start-2 row-start-2 flex gap-3">
        <Link
          to="/constellations/$constellationId"
          from="/constellations/$constellationId/semantic-map"
          params={{ constellationId: constellationId.toString() }}
          search={(s) => s}
          className={cn(
            buttonVariants({ variant: 'default' }),
            'h-full shrink self-stretch justify-self-stretch px-2',
          )}
        >
          <ArrowLeftIcon />
        </Link>

        <ConstellationCollocationFilter className="grow rounded-xl p-2 shadow" />
      </div>
      <ConstellationDiscoursemesEditor
        constellationId={constellationId}
        className="relative col-start-3 row-start-3"
      />
      {isFetching && (
        <LoaderBig className="z-10 col-start-2 row-start-3 self-center justify-self-center" />
      )}
      <div className="col-start-2 row-start-3 self-start justify-self-start">
        <ErrorMessage error={errorCollocation} />
        <ErrorMessage error={errorNewDiscourseme} />
        <ErrorMessage error={errorAddItem} />
      </div>
    </div>
  )
}

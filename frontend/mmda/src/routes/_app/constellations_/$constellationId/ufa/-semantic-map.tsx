import { useMemo, useCallback, useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { cn } from '@cads/shared/lib/utils'
import { clamp } from '@cads/shared/lib/clamp'
import {
  putSemanticMapCoordinates,
  putConstellationDiscoursemeCoordinates,
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
import { CutOffSelect } from '@/components/word-cloud/cut-off-select'
import { LabelBox } from '@cads/shared/components/label-box'

import { ConstellationCollocationFilter } from '../-constellation-filter'
import { ConstellationDiscoursemesEditor } from '../-constellation-discoursemes-editor'
import { useUfaSelection } from './-use-ufa-selection'
import { useUfa } from './-use-ufa'
import { Route } from './route'

export function SemanticMapUfa() {
  const constellationId = parseInt(Route.useParams().constellationId)
  const {
    setDiscoursemeIds,
    clFilterDiscoursemeIds,
    clFilterItem,
    setFilterItem,
  } = useConcordanceFilterContext()
  const [cutOff, setCutOff] = useState(0.5)
  // TODO: unify! Only these lines differ from SemanticMapCollocations
  const { isFaultySelection, analysisLayer } = useUfaSelection()
  const {
    mapItems,
    errors: errorCollocation,
    isFetching,
    description,
  } = useUfa()
  useEffect(() => {
    const minScore = mapItems?.min_score
    if (typeof minScore === 'number') {
      setCutOff(minScore)
    }
  }, [mapItems?.min_score])
  // -----
  const wordsInput = useMemo(
    () =>
      mapItems?.map
        ?.filter((item) => item.source === 'items')
        .map(
          (item): WordCloudWordIn => ({
            x: item.x,
            y: item.y,
            label: item.item,
            score: clamp(item.scaled_score, 0, 1),
          }),
        ) ?? [],
    [mapItems?.map],
  )
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
  const { mutate: updateDiscoursemeCoordinates } = useMutation(
    putConstellationDiscoursemeCoordinates,
  )

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
      if (!description || !analysisLayer) return
      postNewDiscourseme({
        surfaces,
        constellationId,
        constellationDescriptionId: description.id,
        p: analysisLayer,
        name: surfaces.join(' ').substring(0, 25),
      })
    },
    [constellationId, description, postNewDiscourseme, analysisLayer],
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
        p: analysisLayer!,
      })
    },
    [addItem, description?.discourseme_descriptions, analysisLayer],
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
      case 'update_discourseme_position': {
        const descriptionId = description?.id
        if (
          semantic_map_id === undefined ||
          semantic_map_id === null ||
          descriptionId === undefined
        )
          return
        updateDiscoursemeCoordinates({
          constellationId,
          descriptionId,
          semanticMapId: semantic_map_id,
          discourseme_id: event.discoursemeId,
          x_user: event.x,
          y_user: event.y,
        })
        break
      }
      case 'set_filter_item': {
        setFilterItem(event.item ?? undefined, analysisLayer)
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
      {isFaultySelection && (
        <ErrorMessage
          error="The selection is incomplete."
          className="col-start-2 row-start-3"
        />
      )}
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
            cutOff={1 - cutOff}
            onChange={handleCloudChange}
          />
        )}

      <div className="relative col-span-2 col-start-2 row-start-2 flex gap-3">
        <Link
          to="/constellations/$constellationId/ufa"
          from="/constellations/$constellationId/ufa/semantic-map"
          params={{ constellationId: constellationId.toString() }}
          search={(s) => s}
          className={cn(
            buttonVariants({ variant: 'default' }),
            'h-full shrink self-stretch justify-self-stretch px-2',
          )}
        >
          <ArrowLeftIcon />
        </Link>

        <div className="bg-background z-10 flex grow gap-2 rounded-xl p-2 shadow">
          <ConstellationCollocationFilter />

          <LabelBox
            labelText="Association Cut Off"
            className="w-[15rem] shrink-0"
          >
            <CutOffSelect
              value={cutOff}
              onChange={setCutOff}
              options={mapItems?.score_deciles ?? []}
            />
          </LabelBox>
        </div>
      </div>

      {analysisLayer !== undefined && (
        <ConstellationDiscoursemesEditor
          className="relative col-start-3 row-start-3"
          analysisLayer={analysisLayer}
          mapItems={mapItems?.map}
        />
      )}

      {isFetching && (
        <LoaderBig className="z-10 col-start-2 row-start-3 self-center justify-self-center" />
      )}

      <div className="col-start-2 row-start-3 self-start justify-self-start">
        <ErrorMessage
          error={[errorCollocation, errorNewDiscourseme, errorAddItem]}
        />
      </div>
    </div>
  )
}

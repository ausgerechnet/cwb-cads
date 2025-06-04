import { useCallback, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { cn } from '@cads/shared/lib/utils'
import {
  addDescriptionItem,
  createDiscoursemeForConstellationDescription,
} from '@cads/shared/queries'
import { buttonVariants } from '@cads/shared/components/ui/button'
import WordCloud from '@/components/word-cloud'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { LoaderBig } from '@cads/shared/components/loader-big'

import { useDescription } from './-use-description'
import { useCollocation } from './-use-collocation'
import { ConstellationCollocationFilter } from './-constellation-filter'
import { useAnalysisSelection } from './-use-analysis-selection'
import { ConstellationDiscoursemesEditor } from './-constellation-discoursemes-editor'

export function SemanticMapCollocations({
  constellationId,
}: {
  constellationId: number
}) {
  const { analysisLayer: secondary } = useAnalysisSelection()
  const { description } = useDescription()
  const {
    mapItems,
    isFetching,
    collocation: { semantic_map_id } = {},
    error: errorCollocation,
  } = useCollocation(constellationId, description?.id)

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

  const words = useMemo(() => {
    const words = mapItems?.map ?? []
    return words.map(({ scaled_score, discourseme_id, x, y, ...w }) => ({
      x,
      y,
      originX: x,
      originY: y,
      significance: scaled_score,
      discoursemeId: discourseme_id ?? undefined,
      ...w,
    }))
  }, [mapItems])

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
        ({ discourseme_id }) => discourseme_id === discoursemeId,
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

  return (
    <div className="group/map bg-muted grid h-[calc(100svh-3.5rem)] flex-grow grid-cols-[1rem_1fr_25rem_1rem] grid-rows-[1rem_auto_1fr_4rem] gap-5 overflow-hidden">
      {semantic_map_id !== undefined &&
        semantic_map_id !== null &&
        Boolean(mapItems) && (
          <WordCloud
            className={cn(
              'col-start-2 row-start-3 self-stretch justify-self-stretch',
              {
                'pointer-events-none opacity-50': isFetching,
              },
            )}
            words={words}
            semanticMapId={semantic_map_id}
            onNewDiscourseme={onNewDiscourseme}
            onUpdateDiscourseme={onUpdateDiscourseme}
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
        <ErrorMessage
          error={[errorCollocation, errorNewDiscourseme, errorAddItem]}
        />
      </div>
    </div>
  )
}

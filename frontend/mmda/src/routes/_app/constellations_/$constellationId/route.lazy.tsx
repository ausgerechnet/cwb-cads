import { useMemo } from 'react'
import { useSuspenseQuery, useQuery } from '@tanstack/react-query'
import {
  createLazyFileRoute,
  Link,
  useRouterState,
} from '@tanstack/react-router'
import { MapIcon } from 'lucide-react'

import { Card } from '@cads/shared/components/ui/card'
import { Headline3, Muted } from '@cads/shared/components/ui/typography'
import {
  constellationById,
  discoursemesList,
  corpusById,
} from '@cads/shared/queries'
import { cn } from '@cads/shared/lib/utils.ts'
import { AppPageFrameSemanticMap } from '@/components/app-page-frame-drawer'
import { ConcordanceFilterProvider } from '@cads/shared/components/concordances'

import { ConstellationConcordanceLines } from './-constellation-concordance-lines'
import { ConstellationCollocationFilter } from './-constellation-filter'
import { Collocation } from './-constellation-collocation'
import { SemanticMap } from './-semantic-map'
import { useDescription } from './-use-description'
import { SemanticMapPreview } from './-semantic-map-preview'
import { useFilterSelection } from './-use-filter-selection'
import { DiscoursemeList } from './-discourseme-list'
import { AnalysisSelection } from './-analysis-selection'
import { useAnalysisSelection } from './-use-analysis-selection'
import { DescriptionAssociation } from './-description-association'
import { ErrorMessage } from '@cads/shared/components/error-message'

export const Route = createLazyFileRoute(
  '/_app/constellations_/$constellationId',
)({
  component: ConstellationDetail,
})

function ConstellationDetail() {
  // TODO: update @tanstack/react-router to use `useMatch` with 'shouldThrow: false'
  const showsSemanticMap =
    useRouterState().matches.find(
      (match) =>
        match.routeId === '/_app/constellations_/$constellationId/semantic-map',
    ) !== undefined
  const params = Route.useSearch()
  const constellationId = parseInt(Route.useParams().constellationId)

  const hasAnalysisSelection =
    useAnalysisSelection().analysisSelection !== undefined
  const { corpusId, subcorpusId, focusDiscourseme } = useAnalysisSelection()

  const { setFilter, isConcordanceVisible } = useFilterSelection(
    '/_app/constellations_/$constellationId',
  )

  const {
    data: { comment, name, discoursemes: constellationDiscoursemes = [] },
  } = useSuspenseQuery(constellationById(constellationId))
  const { description } = useDescription()
  const { data: discoursemes = [] } = useQuery(discoursemesList)

  const { data: corpus, error: corpusError } = useQuery({
    ...corpusById(corpusId!, subcorpusId),
    enabled: corpusId !== undefined,
  })
  const [layers, structureAttributes] = useMemo(
    () => [corpus?.p_atts ?? [], corpus?.s_atts ?? []],
    [corpus],
  )

  const isMapAvailable =
    corpusId !== undefined && focusDiscourseme !== undefined

  return (
    <ConcordanceFilterProvider
      params={params}
      layers={layers}
      structureAttributes={structureAttributes}
    >
      <AppPageFrameSemanticMap
        title="Constellation"
        showsSemanticMap={showsSemanticMap}
        mapContent={
          <SemanticMap constellationId={constellationId}>
            <ConstellationCollocationFilter
              className="grow rounded-xl p-2 shadow"
              hideSortOrder
            />
          </SemanticMap>
        }
        drawerContent={
          <ConstellationConcordanceLines constellationId={constellationId} />
        }
        isDrawerVisible={isConcordanceVisible}
        onDrawerToggle={(isVisible) =>
          setFilter('isConcordanceVisible', isVisible)
        }
      >
        <ErrorMessage error={corpusError} />

        <Headline3 className="border-0">{name}</Headline3>

        {comment && <Muted>{comment}</Muted>}

        <div className="mb-8 mt-4 grid grid-cols-[2fr_1fr_auto] gap-4">
          <AnalysisSelection />

          <DiscoursemeList
            constellationId={constellationId}
            descriptionId={description?.id as number}
            discoursemes={discoursemes}
            constellationDiscoursemes={constellationDiscoursemes}
          />

          <Link
            to="/constellations/$constellationId/semantic-map"
            from="/constellations/$constellationId"
            params={{ constellationId: constellationId.toString() }}
            search={(s) => s}
            disabled={!isMapAvailable}
            className={cn('transition-opacity focus-visible:outline-none', {
              'opacity-50': !isMapAvailable,
              'group/map-link': isMapAvailable,
            })}
          >
            <Card className="bg-muted text-muted-foreground group-focus-visible/map-link:outline-muted-foreground group-hover/map-link:outline-muted-foreground relative mx-0 flex h-full min-h-48 w-full flex-col place-content-center place-items-center gap-2 overflow-hidden p-4 text-center outline outline-1 outline-transparent transition-all duration-200">
              <SemanticMapPreview className="absolute h-full w-full scale-110 transition-all group-hover/map-link:scale-100 group-hover/map-link:opacity-75 group-focus-visible/map-link:scale-100" />
              <div className="bg-muted/70 group-focus-visible/map-link:bg-muted/90 group-hover/map-link:bg-muted/90 transition-color relative flex gap-3 rounded p-2">
                <MapIcon className="mr-4 h-6 w-6 flex-shrink-0" />
                <span>Semantic Map</span>
              </div>
              {(corpusId === undefined || focusDiscourseme === undefined) && (
                <div className="relative flex flex-col gap-1 rounded bg-amber-200 p-2 text-amber-800">
                  {corpusId === undefined && (
                    <div>Select a corpus to view the map</div>
                  )}{' '}
                  {focusDiscourseme === undefined && (
                    <div>Select a focus discourseme to view the map</div>
                  )}
                </div>
              )}
            </Card>
          </Link>
        </div>

        {description?.id !== undefined &&
          constellationDiscoursemes.length > 1 && (
            <Card className="my-4 p-4">
              <DescriptionAssociation
                constellationId={constellationId}
                descriptionId={description.id}
              />
            </Card>
          )}

        {hasAnalysisSelection && (
          <>
            <ConstellationCollocationFilter className="sticky top-14 mb-8" />

            <Collocation
              constellationId={constellationId}
              descriptionId={description?.id}
            />
          </>
        )}
      </AppPageFrameSemanticMap>
    </ConcordanceFilterProvider>
  )
}

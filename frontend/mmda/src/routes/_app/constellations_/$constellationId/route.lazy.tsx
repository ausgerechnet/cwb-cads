import { useMemo } from 'react'
import { useSuspenseQuery, useQuery } from '@tanstack/react-query'
import {
  createLazyFileRoute,
  Link,
  useRouterState,
} from '@tanstack/react-router'

import { Card } from '@cads/shared/components/ui/card'
import { Headline3, Muted } from '@cads/shared/components/ui/typography'
import {
  constellationById,
  discoursemesList,
  corpusById,
} from '@cads/shared/queries'
import { AppPageFrameSemanticMap } from '@/components/app-page-frame-drawer'
import { ConcordanceFilterProvider } from '@cads/shared/components/concordances'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { buttonVariants } from '@cads/shared/components/ui/button'

import { ConstellationConcordanceLines } from './-constellation-concordance-lines'
import { ConstellationCollocationFilter } from './-constellation-filter'
import { Collocation } from './-constellation-collocation'
import { SemanticMapCollocations } from './-semantic-map-collocation'
import { useDescription } from './-use-description'
import { useFilterSelection } from './-use-filter-selection'
import { DiscoursemeList } from './-discourseme-list'
import { AnalysisSelection } from './-analysis-selection'
import { useAnalysisSelection } from './-use-analysis-selection'
import { DescriptionAssociation } from './-description-association'
import { SemanticMapLink } from './-semantic-map-link'
import { KeywordTable } from './-keyword-table'
import { UfaSelection } from './-ufa-selection'
import { SemanticMapKeyword } from './-semantic-map-keyword'
import { SemanticMapUfa } from './-semantic-map-ufa'

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

  const { analysisSelection: { analysisType } = {} } = useAnalysisSelection()
  const { corpusId, subcorpusId } = useAnalysisSelection()

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
          <>
            {analysisType === 'collocation' && (
              <SemanticMapCollocations constellationId={constellationId} />
            )}

            {analysisType === 'keyword' && (
              <SemanticMapKeyword constellationId={constellationId} />
            )}

            {analysisType === 'ufa' && (
              <SemanticMapUfa constellationId={constellationId} />
            )}

            {!analysisType && (
              <div className="flex gap-4 p-4">
                <Link
                  to="/constellations/$constellationId"
                  from="/constellations/$constellationId/semantic-map"
                  params={(p) => p}
                  search={(s) => s}
                  className={buttonVariants()}
                >
                  Back{' '}
                </Link>

                <ErrorMessage error="Please go back and select an analysis type" />
              </div>
            )}
          </>
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

        <div className="mb-8 mt-4 grid grid-cols-[2fr_1fr_minmax(10rem,1fr)] gap-4">
          <AnalysisSelection />

          <DiscoursemeList
            constellationId={constellationId}
            descriptionId={description?.id as number}
            discoursemes={discoursemes}
            constellationDiscoursemes={constellationDiscoursemes}
          />

          <SemanticMapLink />
        </div>

        {description?.id !== undefined &&
          constellationDiscoursemes.length > 1 && (
            <Card className="my-4 p-1">
              <DescriptionAssociation
                constellationId={constellationId}
                descriptionId={description.id}
              />
            </Card>
          )}

        {analysisType && (
          <ConstellationCollocationFilter className="sticky top-14 mb-8" />
        )}

        {analysisType === 'collocation' && (
          <Collocation
            constellationId={constellationId}
            descriptionId={description?.id}
          />
        )}

        {analysisType === 'keyword' && <KeywordTable />}

        {analysisType === 'ufa' && <UfaSelection />}
      </AppPageFrameSemanticMap>
    </ConcordanceFilterProvider>
  )
}

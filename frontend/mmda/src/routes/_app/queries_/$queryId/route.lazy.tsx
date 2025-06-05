import { useMemo } from 'react'
import {
  ErrorComponentProps,
  Link,
  createLazyFileRoute,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { useQuery, useSuspenseQuery, useMutation } from '@tanstack/react-query'
import { AlertCircle, MapIcon } from 'lucide-react'

import {
  corpusById,
  queryBreakdownForP,
  queryById,
  putSemanticMapCoordinates,
} from '@cads/shared/queries'
import { errorString } from '@cads/shared/lib/error-string'
import { AppPageFrame } from '@/components/app-page-frame'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@cads/shared/components/ui/alert'
import { Headline3, Large } from '@cads/shared/components/ui/typography'
import { Card } from '@cads/shared/components/ui/card'
import { WordCloudPreview } from '@/components/word-cloud-preview'
import { cn } from '@cads/shared/lib/utils'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { AppPageFrameSemanticMap } from '@/components/app-page-frame-drawer'
import {
  ConcordanceFilterProvider,
  useConcordanceFilterContext,
} from '@cads/shared/components/concordances'
import { WordCloudAlt, type WordCloudEvent } from '@/components/word-cloud-alt'

import { QueryConcordanceLines } from './-query-concordance-lines'
import { QueryFrequencyBreakdown } from './-query-frequency-breakdown'
import { QueryFilter } from './-query-filter'
import { DiscoursemeAnalysis } from './-query-discourseme-analysis'
import { QueryCollocation } from './-query-collocation'
import { useCollocation } from './-use-collocation'

export const Route = createLazyFileRoute('/_app/queries_/$queryId')({
  component: SingleQuery,
  errorComponent: SingleQueryError,
})

function SingleQuery() {
  // TODO: update @tanstack/react-router to use `useMatch` with 'shouldThrow: false'
  const showsSemanticMap =
    useRouterState().matches.find(
      (match) => match.routeId === '/_app/queries_/$queryId/semantic-map',
    ) !== undefined
  const queryId = parseInt(Route.useParams().queryId)
  const search = Route.useSearch()
  const navigate = useNavigate()
  const { data: query } = useSuspenseQuery(queryById(queryId))
  const { data: corpus } = useSuspenseQuery(corpusById(query.corpus_id!))

  const structureAttributes = useMemo(
    () => corpus?.s_atts ?? [],
    [corpus?.s_atts],
  )
  const layers = useMemo(() => corpus?.p_atts ?? [], [corpus?.p_atts])

  const { isConcordanceVisible = true, ...searchParams } = Route.useSearch()
  const { data: items = [] } = useQuery({
    ...queryBreakdownForP(queryId, search.pAtt ?? layers[0] ?? ''),
    select: (data) => data?.items?.map((item) => item.item as string) ?? [],
  })
  const { words } = useCollocation()
  const preview =
    words?.map(
      (item) =>
        ({
          x: item.x,
          y: item.y,
          item: item.label,
        }) as const,
    ) ?? []

  const contextBreak = search.contextBreak ?? corpus.s_atts?.[0] ?? ''

  return (
    <ConcordanceFilterProvider
      params={searchParams}
      layers={layers ?? ([] as string[])}
      structureAttributes={structureAttributes ?? ([] as string[])}
    >
      <AppPageFrameSemanticMap
        title="Query"
        showsSemanticMap={showsSemanticMap}
        isDrawerVisible={Boolean(isConcordanceVisible)}
        onDrawerToggle={(isVisible) =>
          navigate({
            to: '',
            params: (p) => p,
            search: (s) => ({ ...s, isConcordanceVisible: isVisible }),
          })
        }
        mapContent={<MapContent />}
        drawerContent={
          <>
            <QueryFilter queryId={queryId} />
            <QueryConcordanceLines
              queryId={queryId}
              className="col-span-full"
            />
          </>
        }
      >
        <div className="grid grid-cols-4 grid-rows-[max-content_1fr_auto] gap-8">
          <Card className="mb-auto p-4 font-mono">
            <Headline3 className="mb-2 text-lg leading-normal">
              Query {corpus.name && `on ${corpus.name}`}
            </Headline3>

            <div className="bg-muted text-muted-foreground whitespace-pre-line rounded-md p-2">
              {query?.cqp_query}
            </div>
          </Card>

          <div className="align-start row-start-2 m-0 mb-auto">
            <DiscoursemeAnalysis
              corpusId={corpus.id}
              pAttributes={layers}
              sAttributes={structureAttributes}
              defaultValues={{
                items,
                s: contextBreak,
              }}
            />
          </div>

          <Card className="col-span-2 row-span-2 p-4">
            <QueryFrequencyBreakdown queryId={queryId} />
          </Card>

          <Link
            to="/queries/$queryId/semantic-map"
            from="/queries/$queryId"
            params={(p) => p}
            search={(s) => s}
            className="group/map-link row-span-2 block transition-opacity focus-visible:outline-none"
          >
            <Card className="bg-muted text-muted-foreground group-focus-visible/map-link:outline-muted-foreground group-hover/map-link:outline-muted-foreground relative mx-0 flex h-full min-h-48 w-full flex-col place-content-center place-items-center gap-2 overflow-hidden p-4 text-center outline outline-1 outline-transparent transition-all duration-200">
              <WordCloudPreview
                className="absolute h-full w-full scale-110 transition-all group-hover/map-link:scale-100 group-hover/map-link:opacity-75 group-focus-visible/map-link:scale-100"
                items={preview}
              />

              <div className="bg-muted/70 group-focus-visible/map-link:bg-muted/90 group-hover/map-link:bg-muted/90 transition-color relative flex gap-3 rounded p-2">
                <MapIcon className="mr-4 h-6 w-6 flex-shrink-0" />

                <span>Semantic Map</span>
              </div>
            </Card>
          </Link>
        </div>

        <QueryCollocation />
      </AppPageFrameSemanticMap>
    </ConcordanceFilterProvider>
  )
}

function MapContent() {
  const { words, semanticMapId } = useCollocation()
  const { secondary, clFilterItem, setFilterItem } =
    useConcordanceFilterContext()
  const { mutate: updateCoordinates } = useMutation(putSemanticMapCoordinates)

  function handleChange(event: WordCloudEvent) {
    switch (event.type) {
      case 'update_surface_position': {
        if (semanticMapId === undefined || semanticMapId === null) return
        updateCoordinates({
          semanticMapId,
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
    }
  }
  return (
    <>
      <div className="overflow-hidden">
        <Link
          to="/queries/$queryId"
          from="/queries/$queryId/semantic-map"
          params={(p) => p}
          search={(s) => s}
          className={cn(
            buttonVariants({ variant: 'default' }),
            'relative z-10 mb-8 block',
          )}
        >
          To Query
        </Link>
        <div className="relative z-0 h-[calc(100svh-11rem)]">
          <WordCloudAlt
            words={words}
            className="absolute inset-0"
            onChange={handleChange}
            filterItem={clFilterItem}
          />
        </div>
      </div>
    </>
  )
}

function SingleQueryError({ error }: ErrorComponentProps) {
  // @ts-expect-error the error type is unknown
  const isMissingError = error?.response?.status === 404

  if (isMissingError) {
    return (
      <AppPageFrame title="Query 404">
        <Large>
          Query not found.
          <br />
          Return to the{' '}
          <Link to="/queries" className="underline">
            Query overview
          </Link>
          .
        </Large>
      </AppPageFrame>
    )
  }

  return (
    <AppPageFrame title="Query">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>An error occurred while loading the query.</AlertTitle>
        {Boolean(error) && (
          <AlertDescription>{errorString(error)}</AlertDescription>
        )}
      </Alert>
    </AppPageFrame>
  )
}

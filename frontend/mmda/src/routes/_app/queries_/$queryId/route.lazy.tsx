import {
  ErrorComponentProps,
  Link,
  createLazyFileRoute,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { AlertCircle, MapIcon } from 'lucide-react'

import { corpusById, queryBreakdownForP, queryById } from '@cads/shared/queries'
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
import WordCloud from '@/components/word-cloud'
import { AppPageFrameSemanticMap } from '@/components/app-page-frame-drawer'

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

  const { isConcordanceVisible = true } = Route.useSearch()
  const { data: query } = useSuspenseQuery(queryById(queryId))
  const { data: corpus } = useSuspenseQuery(corpusById(query.corpus_id!))
  const pAtt = search.pAtt ?? corpus.p_atts?.[0] ?? ''
  const contextBreak = search.contextBreak ?? corpus.s_atts?.[0] ?? ''
  const { data: items = [] } = useQuery({
    ...queryBreakdownForP(queryId, pAtt),
    select: (data) => data?.items?.map((item) => item.item as string) ?? [],
  })
  const { words } = useCollocation()

  const navigate = useNavigate()
  const setSearch = (key: string, value: string | number | boolean) =>
    navigate({
      // TODO: this should be nicely typed
      // eslint-disable-next-line
      // @ts-ignore
      params: (p: Record<string, string | number | boolean>) => p,
      // eslint-disable-next-line
      // @ts-ignore
      search: (s) => ({ ...s, [key]: value }),
    })
  const corpusName = query?.corpus_name

  return (
    <AppPageFrameSemanticMap
      title="Query"
      showsSemanticMap={showsSemanticMap}
      isDrawerVisible={Boolean(isConcordanceVisible)}
      onDrawerToggle={(isVisible) =>
        setSearch('isConcordanceVisible', isVisible)
      }
      mapContent={<MapContent />}
      drawerContent={
        <>
          <QueryFilter queryId={queryId} corpusId={query.corpus_id!} />
          <QueryConcordanceLines queryId={queryId} className="col-span-full" />
        </>
      }
    >
      <div className="grid grid-cols-4 grid-rows-[max-content_1fr_auto] gap-8">
        <Card className="mb-auto p-4 font-mono">
          <Headline3 className="mb-2 text-lg leading-normal">
            Query {corpusName && `on ${corpusName}`}
          </Headline3>

          <div className="bg-muted text-muted-foreground whitespace-pre-line rounded-md p-2">
            {query?.cqp_query}
          </div>
        </Card>

        <div className="align-start row-start-2 m-0 mb-auto">
          <DiscoursemeAnalysis
            corpusId={query?.corpus_id ?? -1}
            pAttributes={corpus.p_atts ?? []}
            sAttributes={corpus.s_atts ?? []}
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
              items={words}
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
  )
}

function MapContent() {
  const { words, semanticMapId } = useCollocation()
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
        <div className="relative h-[calc(100svh-11rem)]">
          <WordCloud
            words={words}
            semanticMapId={semanticMapId}
            className="absolute inset-0"
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

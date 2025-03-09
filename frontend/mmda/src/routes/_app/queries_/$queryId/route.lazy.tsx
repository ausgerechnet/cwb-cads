import {
  ErrorComponentProps,
  Link,
  createLazyFileRoute,
  useNavigate,
} from '@tanstack/react-router'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'

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
import { Drawer } from '@/components/drawer'
import { QueryConcordanceLines } from './-query-concordance-lines'
import { QueryFrequencyBreakdown } from './-query-frequency-breakdown'
import { QueryFilter } from './-query-filter'
import { DiscoursemeAnalysis } from './-query-discourseme-analysis'

export const Route = createLazyFileRoute('/_app/queries_/$queryId')({
  component: SingleQuery,
  errorComponent: SingleQueryError,
})

function SingleQuery() {
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
    <AppPageFrame
      title="Query"
      classNameContainer="pb-0 flex-grow"
      classNameContent="pb-0"
    >
      <div className="grid grid-cols-3 grid-rows-[max-content_1fr_auto] gap-8">
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
      </div>
      <QueryFilter
        queryId={queryId}
        corpusId={query.corpus_id!}
        className="bg-background sticky top-14"
      />
      <div className="bg-muted text-muted-foreground min-h-[150svh] rounded-xl p-4">
        Placeholder: Collocation
      </div>
      <Drawer
        isVisible={Boolean(isConcordanceVisible)}
        onToggle={(isVisible) => setSearch('isConcordanceVisible', isVisible)}
        className="col-span-full"
      >
        <QueryConcordanceLines queryId={queryId} className="col-span-full" />
      </Drawer>
    </AppPageFrame>
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

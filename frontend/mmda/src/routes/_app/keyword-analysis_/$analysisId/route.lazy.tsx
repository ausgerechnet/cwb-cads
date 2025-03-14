import {
  createLazyFileRoute,
  Link,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { AppPageFrame } from '@/components/app-page-frame'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { MapIcon, XIcon } from 'lucide-react'
import {
  getQueryAssisted,
  keywordAnalysisById,
  keywordAnalysisItemsById,
} from '@cads/shared/queries'
import { Drawer } from '@/components/drawer'
import { formatNumber } from '@cads/shared/lib/format-number'
import {
  Select,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@cads/shared/components/ui/select'
import { Label } from '@cads/shared/components/ui/label'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { WordCloudPreview } from '@/components/word-cloud-preview'
import { Card } from '@cads/shared/components/ui/card'

import { useFilterSelection } from '../../constellations_/$constellationId/-use-filter-selection'
import { QueryConcordanceLines } from './-keyword-concordance-lines'
import { KeywordTable } from './-keywords'
import { QueryFilter } from './-query-filter'

export const Route = createLazyFileRoute('/_app/keyword-analysis_/$analysisId')(
  {
    component: KeywordAnalysis,
  },
)

function KeywordAnalysis() {
  // TODO: update @tanstack/react-router to use `useMatch` with 'shouldThrow: false'
  const showsSemanticMap =
    useRouterState().matches.find(
      (match) =>
        match.routeId === '/_app/keyword-analysis_/$analysisId/semantic-map',
    ) !== undefined

  const { ccSortOrder, ccSortBy } = useFilterSelection(
    '/_app/keyword-analysis_/$analysisId',
  )
  const { clIsVisible = false, clCorpus = 'target' } = Route.useSearch()
  const { clFilterItem } = useFilterSelection(
    '/_app/keyword-analysis_/$analysisId',
  )
  const navigate = useNavigate()
  const analysisId = parseInt(Route.useParams().analysisId)
  const { data: analysisData } = useSuspenseQuery(
    keywordAnalysisById(analysisId),
  )
  const p =
    clFilterItem === undefined ? analysisData?.p : analysisData?.p_reference

  const { data: query, error: queryError } = useQuery({
    ...getQueryAssisted({
      corpusId:
        clCorpus === 'target'
          ? analysisData?.corpus_id
          : analysisData?.corpus_id_reference,
      subcorpusId:
        clCorpus === 'target'
          ? analysisData?.subcorpus_id
          : analysisData?.subcorpus_id_reference,
      p,
      items: [clFilterItem!],
    }),
    enabled: clFilterItem !== undefined && analysisData !== undefined,
  })

  const { data: mapItems, error: errorMapItems } = useQuery({
    ...keywordAnalysisItemsById(analysisId, {
      sortOrder: ccSortOrder,
      sortBy: ccSortBy,
      pageSize: 300,
      pageNumber: 1,
    }),
    select: ({ coordinates }) => {
      return coordinates
    },
  })

  return (
    <AppPageFrame
      title="Keyword Analysis"
      classNameContent="flex flex-col"
      classNameContainer="min-h-full pb-0"
    >
      {showsSemanticMap && (
        <Link
          to="/keyword-analysis/$analysisId"
          from="/keyword-analysis/$analysisId/semantic-map"
          params={(p) => p}
          search={(s) => s}
          className={buttonVariants({ variant: 'secondary' })}
        >
          Back to Keyword Analysis
        </Link>
      )}

      {!showsSemanticMap && (
        <>
          <div className="mb-8 flex gap-4">
            {analysisData && (
              <dl className="mr-auto inline-grid grid-cols-[auto,auto] content-start gap-x-2 gap-y-1">
                <dt>Target Corpus Name:</dt>
                <dd>
                  {analysisData.corpus_name} on {analysisData.p}
                </dd>
                <dt>Reference Corpus Name:</dt>
                <dd>
                  {analysisData.corpus_name_reference} on{' '}
                  {analysisData.p_reference}
                </dd>
                <dt>Number of Items:</dt>
                <dd>{formatNumber(analysisData.nr_items)}</dd>
              </dl>
            )}

            <Link
              to="/keyword-analysis/$analysisId/semantic-map"
              from="/keyword-analysis/$analysisId"
              params={(p) => p}
              search={(s) => s}
              className="group/map-link block transition-opacity focus-visible:outline-none"
            >
              <Card className="bg-muted text-muted-foreground group-focus-visible/map-link:outline-muted-foreground group-hover/map-link:outline-muted-foreground relative mx-0 flex h-full min-h-48 w-full flex-col place-content-center place-items-center gap-2 overflow-hidden p-4 text-center outline outline-1 outline-transparent transition-all duration-200">
                <WordCloudPreview
                  className="absolute h-full w-full scale-110 transition-all group-hover/map-link:scale-100 group-hover/map-link:opacity-75 group-focus-visible/map-link:scale-100"
                  items={mapItems}
                />
                <div className="bg-muted/70 group-focus-visible/map-link:bg-muted/90 group-hover/map-link:bg-muted/90 transition-color relative flex gap-3 rounded p-2">
                  <MapIcon className="mr-4 h-6 w-6 flex-shrink-0" />
                  <span>Semantic Map</span>
                </div>
                <ErrorMessage error={errorMapItems} />
              </Card>
            </Link>
          </div>

          <KeywordTable analysisId={analysisId} />
        </>
      )}

      <Drawer
        className="-mx-2 my-auto mb-0"
        isVisible={clIsVisible}
        onToggle={(clIsVisible) =>
          navigate({
            to: '',
            params: (p) => p,
            search: (s) => ({ ...s, clIsVisible }),
          })
        }
      >
        <div className="col-span-2 flex gap-4">
          <Label className="mb-8 grid w-min shrink grow-0 flex-col gap-1 whitespace-nowrap">
            <span className="text-muted-foreground text-xs">Corpus</span>
            <Select
              value={clCorpus}
              onValueChange={(clCorpus) => {
                if (clCorpus !== 'target' && clCorpus !== 'reference') return
                navigate({
                  to: '',
                  params: (p) => p,
                  search: (s) => ({ ...s, clCorpus }),
                })
              }}
            >
              <SelectTrigger className="max-w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="target">
                  Target: {analysisData.corpus_name}
                </SelectItem>
                <SelectItem value="reference">
                  Reference: {analysisData.corpus_name_reference}
                </SelectItem>
              </SelectContent>
            </Select>
          </Label>

          <Label className="mb-8 grid w-min shrink grow-0 flex-col gap-1 whitespace-nowrap">
            <span className="text-muted-foreground text-xs">Filter Item</span>
            <div className="flex flex-grow gap-1">
              <div className="bg-muted flex min-h-10 flex-grow items-center rounded px-2">
                {clFilterItem === undefined ? (
                  <span className="text-muted-foreground text-xs italic">
                    None
                  </span>
                ) : (
                  <>{clFilterItem}</>
                )}
              </div>

              {Boolean(clFilterItem) && (
                <Link
                  className={buttonVariants({
                    variant: 'secondary',
                    size: 'icon',
                  })}
                  to=""
                  params={(p) => p}
                  search={(s) => ({ ...s, clFilterItem: undefined })}
                >
                  <XIcon className="h-4 w-4" />
                </Link>
              )}
            </div>
          </Label>

          {query && (
            <QueryFilter
              corpusId={query.corpus_id}
              queryId={query.id}
              className="grow"
              p={p}
            />
          )}
        </div>
        {query && (
          <>
            <ErrorMessage error={queryError} />
            <QueryConcordanceLines queryId={query.id} p={p} />
          </>
        )}
      </Drawer>
    </AppPageFrame>
  )
}

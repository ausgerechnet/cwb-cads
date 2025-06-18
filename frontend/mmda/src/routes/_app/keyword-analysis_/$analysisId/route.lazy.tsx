import {
  createLazyFileRoute,
  Link,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { z } from 'zod'
import { useQuery, useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { ArrowLeftIcon, MapIcon } from 'lucide-react'
import { useMemo } from 'react'

import {
  corpusById,
  getQueryAssisted,
  keywordAnalysisById,
  keywordAnalysisItemsById,
  putSemanticMapCoordinates,
} from '@cads/shared/queries'
import { formatNumber } from '@cads/shared/lib/format-number'
import { LabelBox } from '@cads/shared/components/label-box'
import {
  Select,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectGroup,
} from '@cads/shared/components/ui/select'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { WordCloudPreview } from '@/components/word-cloud-preview'
import { Card } from '@cads/shared/components/ui/card'
import { cn } from '@cads/shared/lib/utils'
import { LoaderBig } from '@cads/shared/components/loader-big'
import { AppPageFrameSemanticMap } from '@/components/app-page-frame-drawer'
import { schemas } from '@cads/shared/api-client'
import { measures, useMeasureSelection } from '@cads/shared/components/measures'
import {
  WordCloud,
  type WordCloudWordIn,
  type WordCloudEvent,
} from '@/components/word-cloud'

import { useFilterSelection } from '../../constellations_/$constellationId/-use-filter-selection'
import { QueryConcordanceLines } from './-keyword-concordance-lines'
import { KeywordTable } from './-keywords'
import { QueryFilter } from './-query-filter'
import {
  ConcordanceFilterProvider,
  FilterItemInput,
} from '@cads/shared/components/concordances'

export const Route = createLazyFileRoute('/_app/keyword-analysis_/$analysisId')(
  { component: KeywordAnalysis },
)

function KeywordAnalysis() {
  // TODO: update @tanstack/react-router to use `useMatch` with 'shouldThrow: false'
  const showsSemanticMap =
    useRouterState().matches.find(
      (match) =>
        match.routeId === '/_app/keyword-analysis_/$analysisId/semantic-map',
    ) !== undefined
  const searchParams = Route.useSearch()
  const clIsVisible = Boolean(searchParams.clIsVisible)

  const { ccSortBy = 'conservative_log_ratio' } = useFilterSelection(
    '/_app/keyword-analysis_/$analysisId',
  )
  const navigate = useNavigate()
  const analysisId = parseInt(Route.useParams().analysisId)
  const { data: analysisData } = useSuspenseQuery(
    keywordAnalysisById(analysisId),
  )
  const { data: corpus } = useSuspenseQuery(
    corpusById(analysisData.corpus_id, analysisData.subcorpus_id),
  )

  const {
    data: { items, coordinates } = {},
    isLoading: isLoadingMap,
    error: errorMapItems,
  } = useQuery({
    ...keywordAnalysisItemsById(analysisId, {
      sortOrder: 'descending',
      sortBy: ccSortBy,
      pageSize: 300,
      pageNumber: 1,
    }),
  })

  return (
    <ConcordanceFilterProvider
      params={searchParams}
      layers={corpus.p_atts}
      structureAttributes={corpus.s_atts}
    >
      <AppPageFrameSemanticMap
        title="Keyword Analysis"
        showsSemanticMap={showsSemanticMap}
        isDrawerVisible={clIsVisible}
        onDrawerToggle={(clIsVisible) =>
          navigate({
            to: '',
            params: (p) => p,
            search: (s) => ({ ...s, clIsVisible }),
          })
        }
        mapContent={
          <MapContent
            keywordItems={items}
            coordinates={coordinates}
            isLoading={isLoadingMap}
            ccSortBy={ccSortBy}
            semanticMapId={analysisData?.semantic_map_id ?? null}
          />
        }
        drawerContent={<DrawerContent />}
      >
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
            className="group/map-link block aspect-[2/1] transition-opacity focus-visible:outline-none"
          >
            <Card className="bg-muted text-muted-foreground group-focus-visible/map-link:outline-muted-foreground group-hover/map-link:outline-muted-foreground relative mx-0 flex h-full min-h-48 w-full flex-col place-content-center place-items-center gap-2 overflow-hidden p-4 text-center outline outline-1 outline-transparent transition-all duration-200">
              <WordCloudPreview
                className="absolute h-full w-full scale-110 transition-all group-hover/map-link:scale-100 group-hover/map-link:opacity-75 group-focus-visible/map-link:scale-100"
                items={coordinates}
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
      </AppPageFrameSemanticMap>
    </ConcordanceFilterProvider>
  )
}

function DrawerContent() {
  const analysisId = parseInt(Route.useParams().analysisId)
  const { data: analysisData } = useSuspenseQuery(
    keywordAnalysisById(analysisId),
  )
  const { clCorpus = 'target' } = Route.useSearch()

  const { clFilterItem } = useFilterSelection(
    '/_app/keyword-analysis_/$analysisId',
  )

  const p =
    clFilterItem === undefined ? analysisData?.p : analysisData?.p_reference
  const navigate = useNavigate()

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

  return (
    <>
      <div className="col-span-2 flex gap-4">
        <LabelBox labelText="Corpus">
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
        </LabelBox>

        <FilterItemInput />

        {query && <QueryFilter queryId={query.id} className="grow" />}
      </div>

      {query && (
        <>
          <ErrorMessage error={queryError} />
          <QueryConcordanceLines queryId={query.id} />
        </>
      )}
    </>
  )
}

function MapContent({
  keywordItems,
  coordinates,
  isLoading,
  ccSortBy,
  semanticMapId = null,
}: {
  keywordItems: z.infer<typeof schemas.KeywordItemOut>[] | undefined
  coordinates: z.infer<typeof schemas.CoordinatesOut>[] | undefined
  isLoading: boolean
  ccSortBy: (typeof measures)[number]
  semanticMapId?: number | null
}) {
  const { clFilterItem } = Route.useSearch()
  const navigate = useNavigate()

  const { measures, measureNameMap } = useMeasureSelection(ccSortBy)

  const words = useMemo(
    () =>
      keywordItems?.map(({ item, scaled_scores }): WordCloudWordIn => {
        const { x = 0, y = 0 } = coordinates?.find((c) => c.item === item) ?? {}
        const score = scaled_scores.find((s) => s.measure === ccSortBy)?.score
        if (score === undefined) {
          throw new Error(
            `Score not found for "${item}" for measure "${ccSortBy}"`,
          )
        }
        return { label: item, x, y, score }
      }) ?? [],
    [ccSortBy, coordinates, keywordItems],
  )

  const { mutate: updateCoordinates } = useMutation(putSemanticMapCoordinates)

  function handleChange(event: WordCloudEvent) {
    switch (event.type) {
      case 'update_surface_position': {
        if (semanticMapId === null) return
        updateCoordinates({
          semanticMapId,
          item: event.surface,
          x_user: event.x,
          y_user: event.y,
        })
        break
      }
      case 'set_filter_item': {
        navigate({
          to: '',
          params: (p) => p,
          search: (s) => ({
            ...s,
            clFilterItem: event.item ?? undefined,
          }),
        })
        break
      }
    }
  }

  return (
    <div className="group/map bg-muted/50 grid h-[calc(100svh-3.5rem)] flex-grow grid-cols-[1rem_1fr_25rem_1rem] grid-rows-[1rem_auto_1fr_4rem] gap-5 overflow-hidden">
      <div className="relative z-20 col-span-2 col-start-2 row-start-2 flex gap-3">
        <Link
          to="/keyword-analysis/$analysisId"
          from="/keyword-analysis/$analysisId/semantic-map"
          params={(p) => p}
          search={(s) => s}
          className={cn(
            buttonVariants({ variant: 'default' }),
            'ring-offset-background focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 active inline-flex h-full shrink cursor-pointer items-center justify-center self-start justify-self-start whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <ArrowLeftIcon />
        </Link>

        <div className="bg-background z-10 flex grow gap-2 rounded-xl p-2 shadow">
          <LabelBox labelText="Sort By" className="ml-auto min-w-96">
            <Select
              onValueChange={(ccSortBy) => {
                navigate({
                  to: '',
                  params: (p) => p,
                  search: (s) => ({ ...s, ccSortBy }),
                })
              }}
              value={ccSortBy}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No Query Layer Selected" />
              </SelectTrigger>

              <SelectContent>
                <SelectGroup>
                  {measures.map((measure) => (
                    <SelectItem key={measure} value={measure}>
                      {measureNameMap.get(measure)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </LabelBox>
        </div>
      </div>

      <div className="relative z-0 col-span-2 col-start-2 row-start-3 h-[calc(100svh-18rem)]">
        {isLoading ? (
          <LoaderBig className="place-self-center self-center justify-self-center" />
        ) : (
          <WordCloud
            words={words}
            className="absolute inset-0 h-full w-full"
            onChange={handleChange}
            filterItem={clFilterItem}
          />
        )}
      </div>
    </div>
  )
}

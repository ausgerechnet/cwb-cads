import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { AppPageFrame } from '@/components/app-page-frame'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { getQueryAssisted, keywordAnalysisById } from '@cads/shared/queries'
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

import { useFilterSelection } from '../constellations_/$constellationId/-use-filter-selection'
import { QueryConcordanceLines } from './-keyword-concordance-lines'
import { KeywordTable } from './-keywords'
import { QueryFilter } from './-query-filter'

export const Route = createLazyFileRoute('/_app/keyword-analysis_/$analysisId')(
  { component: KeywordAnalysis },
)

function KeywordAnalysis() {
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

  return (
    <AppPageFrame
      title="Keyword Analysis"
      classNameContent="flex flex-col"
      classNameContainer="min-h-full pb-0"
    >
      {analysisData && (
        <dl className="mr-auto inline-grid grid-cols-[auto,auto] gap-x-2">
          <dt>Target Corpus Name:</dt>
          <dd>
            {analysisData.corpus_name} on {analysisData.p}
          </dd>
          <dt>Reference Corpus Name:</dt>
          <dd>
            {analysisData.corpus_name_reference} on {analysisData.p_reference}
          </dd>
          <dt>Number of Items:</dt>
          <dd>{formatNumber(analysisData.nr_items)}</dd>
        </dl>
      )}
      <KeywordTable analysisId={analysisId} />
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

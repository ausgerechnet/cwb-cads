import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { AppPageFrame } from '@/components/app-page-frame'
import { useSuspenseQuery } from '@tanstack/react-query'
import { keywordAnalysisById } from '@cads/shared/queries'
import { Drawer } from '@/components/drawer'
import { formatNumber } from '@cads/shared/lib/format-number'
import { KeywordTable } from './-keywords'

export const Route = createLazyFileRoute('/_app/keyword-analysis_/$analysisId')(
  { component: KeywordAnalysis },
)

function KeywordAnalysis() {
  const { clIsVisible = false } = Route.useSearch()
  const navigate = useNavigate()
  const analysisId = parseInt(Route.useParams().analysisId)
  const { data: analysisData } = useSuspenseQuery(
    keywordAnalysisById(analysisId),
  )

  return (
    <AppPageFrame
      title="Keyword Analysis"
      classNameContent="flex flex-col"
      classNameContainer="min-h-full"
    >
      {analysisData && (
        <dl className="mr-auto inline-grid grid-cols-[auto,auto] gap-x-2">
          <dt>Corpus Name:</dt>
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
        Concordance Lines Go Here
      </Drawer>
    </AppPageFrame>
  )
}

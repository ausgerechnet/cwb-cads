import { createLazyFileRoute } from '@tanstack/react-router'
import { AppPageFrame } from '@/components/app-page-frame'
import { useSuspenseQuery } from '@tanstack/react-query'
import { keywordAnalysisById } from '@/queries/queries'

export const Route = createLazyFileRoute('/_app/keyword-analysis/$analysisId')({
  component: KeywordAnalysis,
})

function KeywordAnalysis() {
  const analysisId = parseInt(Route.useParams().analysisId)
  const { data: analysisData } = useSuspenseQuery(
    keywordAnalysisById(analysisId),
  )

  return (
    <AppPageFrame title={`Keyword Analysis ${analysisId}`}>
      <div className="bg-muted text-muted-foreground whitespace-pre rounded-xl p-4 font-mono">
        {JSON.stringify(analysisData, null, 2)}
      </div>
    </AppPageFrame>
  )
}

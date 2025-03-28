import { useQuery } from '@tanstack/react-query'

import { constellationKeywordAnalysisItems } from '@cads/shared/queries'

import { useAnalysisSelection } from './-use-analysis-selection'
import { useDescription } from './-use-description'
import { useKeywordAnalysis } from './-use-keyword-analysis'
import { ErrorMessage } from '@cads/shared/components/error-message'

export function KeywordTable() {
  const analysisSelection = useAnalysisSelection().analysisSelection
  const { constellationId, description } = useDescription()
  const descriptionId = description?.id
  const { keywordId } = useKeywordAnalysis()

  if (analysisSelection?.analysisType !== 'keyword') {
    throw new Error('KeywordTable can only be used with keyword analysis')
  }

  const { data, error, isLoading } = useQuery({
    ...constellationKeywordAnalysisItems(
      constellationId,
      descriptionId!,
      keywordId!,
      {},
    ),
    retry: 0,
    enabled: descriptionId !== undefined && keywordId !== undefined,
  })

  if (error) {
    return <ErrorMessage error={error} />
  }

  return (
    <code className="bg-muted text-muted-foreground block whitespace-pre rounded p-2">
      {isLoading && <div className="animate-pulse text-center">Loading...</div>}
      {JSON.stringify(data, null, 2)}
    </code>
  )
}

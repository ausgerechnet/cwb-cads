import { keywordAnalysisById } from '@cads/shared/queries'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/keyword-analysis/$analysisId')({
  loader: ({ context: { queryClient }, params: { analysisId } }) =>
    queryClient.ensureQueryData(keywordAnalysisById(parseInt(analysisId))),
})

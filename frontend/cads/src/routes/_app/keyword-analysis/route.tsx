import { createFileRoute } from '@tanstack/react-router'

import { keywordAnalysesList } from '@cads/shared/queries'
import { DefaultPendingComponent } from '@/components/default-pending-component'
import { KeywordAnalysisLayout } from './-keyword-analysis-layout'

export const Route = createFileRoute('/_app/keyword-analysis')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(keywordAnalysesList),
  pendingComponent: () => (
    <KeywordAnalysisLayout>
      <DefaultPendingComponent />
    </KeywordAnalysisLayout>
  ),
})

import { createLazyFileRoute } from '@tanstack/react-router'
import { AppPageFrame } from '@/components/app-page-frame'

export const Route = createLazyFileRoute('/_app/keyword-analysis/new')({
  component: KeywordAnalysisNew,
  pendingComponent: LoaderKeywordAnalysisNew,
})

function KeywordAnalysisNew() {
  return (
    <AppPageFrame title="Create new Keyword Analysis">
      Form goes here!
    </AppPageFrame>
  )
}

function LoaderKeywordAnalysisNew() {
  return (
    <AppPageFrame title="Create new Keyword Analysis">
      <h1>Loading...</h1>
    </AppPageFrame>
  )
}

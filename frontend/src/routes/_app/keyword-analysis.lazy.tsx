import { AppPageFrame } from '@/components/app-page-frame'
import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_app/keyword-analysis')({
  component: () => <KeywordAnalysis />,
})

function KeywordAnalysis() {
  return <AppPageFrame title="Keyword Analysis" />
}

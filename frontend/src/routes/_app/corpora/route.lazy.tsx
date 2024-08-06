import { AppPageFrame } from '@/components/app-page-frame'
import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_app/corpora')({
  component: CorporaOverview,
})

function CorporaOverview() {
  return <AppPageFrame title="Corpora"></AppPageFrame>
}

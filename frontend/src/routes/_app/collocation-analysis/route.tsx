import { AppPageFrame } from '@/components/app-page-frame'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/collocation-analysis')({
  component: CollocationAnalysis,
})

function CollocationAnalysis() {
  return (
    <AppPageFrame
      title="Collocation Analysis"
      cta={{
        nav: {
          to: '/collocation-analysis/new',
        },
        label: 'New Collocation Analysis',
      }}
    >
      Collocation Analysis goes here
    </AppPageFrame>
  )
}

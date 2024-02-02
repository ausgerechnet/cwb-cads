import { createFileRoute } from '@tanstack/react-router'
import { collocationsQueryOptions } from '@/lib/queries'
import { AppPageFrame } from '@/components/app-page-frame'

export const Route = createFileRoute('/_app/collocation-analysis')({
  component: CollocationAnalysis,
  loader: async ({ context: { queryClient } }) => ({
    collocationAnalyses: await queryClient.ensureQueryData(
      collocationsQueryOptions,
    ),
  }),
})

function CollocationAnalysis() {
  const { collocationAnalyses } = Route.useLoaderData()
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
      <div className="whitespace-pre rounded-md bg-muted p-2 text-muted-foreground">
        {JSON.stringify(collocationAnalyses, null, '  ')}
      </div>
    </AppPageFrame>
  )
}

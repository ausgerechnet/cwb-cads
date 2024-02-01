import { createLazyFileRoute } from '@tanstack/react-router'
import { AppPageFrame } from '@/components/app-page-frame'

export const Route = createLazyFileRoute('/_app/collocation-analysis/new')({
  component: NewCollocationAnalysis,
})

function NewCollocationAnalysis() {
  const { queries } = Route.useLoaderData()
  const { queryId } = Route.useSearch()
  return (
    <AppPageFrame title="New Collocation Analysis">
      <div>Query ID: {queryId}</div>
      <div className="whitespace-pre rounded-md bg-muted p-2 text-muted-foreground">
        {JSON.stringify(queries, null, '  ')}
      </div>
    </AppPageFrame>
  )
}

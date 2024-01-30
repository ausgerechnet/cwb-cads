import { AppPageFrame } from '@/components/app-page-frame'
import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_app/queries/$queryId')({
  component: SingleQuery,
})

function SingleQuery() {
  return (
    <AppPageFrame title="Query">
      <div className="mono whitespace-pre rounded-md bg-muted p-2 text-sm leading-tight text-muted-foreground">
        {JSON.stringify(Route.useLoaderData().query, null, 2)}
      </div>
    </AppPageFrame>
  )
}

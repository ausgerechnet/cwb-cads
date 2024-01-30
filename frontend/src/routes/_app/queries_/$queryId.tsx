import { AppPageFrame } from '@/components/app-page-frame'
import { queryQueryOptions } from '@/lib/queries'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/queries/$queryId')({
  component: SingleQuery,
  loader: async ({ context: { queryClient }, params: { queryId } }) => ({
    query: await queryClient.ensureQueryData(queryQueryOptions(queryId)),
  }),
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
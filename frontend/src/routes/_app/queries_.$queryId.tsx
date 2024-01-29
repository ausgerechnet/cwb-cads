import { queryQueryOptions } from '@/lib/queries'
import { FileRoute } from '@tanstack/react-router'

export const Route = new FileRoute('/_app/queries/$queryId').createRoute({
  component: SingleQuery,
  loader: async ({ context: { queryClient }, params: { queryId } }) => ({
    query: await queryClient.ensureQueryData(queryQueryOptions(queryId)),
  }),
})

function SingleQuery() {
  return (
    <div>
      <h1>Query</h1>
      <div className="mono whitespace-pre rounded-md bg-muted p-2 text-sm leading-tight text-muted-foreground">
        {JSON.stringify(Route.useLoaderData().query, null, 2)}
      </div>
    </div>
  )
}

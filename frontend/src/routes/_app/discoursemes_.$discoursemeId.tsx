import { AppPageFrame } from '@/components/app-page-frame'
import { discoursemeQueryOptions } from '@/lib/queries'
import { FileRoute } from '@tanstack/react-router'

export const Route = new FileRoute('/_app/discoursemes/$discoursemeId').createRoute({
  component: SingleDiscourseme,
  loader: async ({ context: { queryClient }, params: { discoursemeId } }) => ({
    query: await queryClient.ensureQueryData(
      discoursemeQueryOptions(discoursemeId),
    ),
  }),
})

function SingleDiscourseme() {
  return (
    <AppPageFrame title="Discourseme">
      <div className="mono whitespace-pre rounded-md bg-muted p-2 text-sm leading-tight text-muted-foreground">
        {JSON.stringify(Route.useLoaderData().query, null, 2)}
      </div>
    </AppPageFrame>
  )
}

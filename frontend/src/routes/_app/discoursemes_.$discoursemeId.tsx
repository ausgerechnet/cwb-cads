import { createFileRoute } from '@tanstack/react-router'
import { AppPageFrame } from '@/components/app-page-frame'
import { discoursemeQueryOptions } from '@/lib/queries'

export const Route = createFileRoute('/_app/discoursemes/$discoursemeId')({
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
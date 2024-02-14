import { AppPageFrame } from '@/components/app-page-frame'
import { constellationQueryOptions } from '@/lib/queries'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute(
  '/_app/constellations/$constellationId',
)({
  component: ConstellationDetail,
})

function ConstellationDetail() {
  const { constellationId } = Route.useParams()
  const { data } = useSuspenseQuery(constellationQueryOptions(constellationId))

  return (
    <AppPageFrame title="Constellation">
      <div className="whitespace-pre-line rounded-md bg-muted p-4 font-mono text-sm leading-tight text-muted-foreground">
        {JSON.stringify(data, null, 2)}
      </div>
    </AppPageFrame>
  )
}

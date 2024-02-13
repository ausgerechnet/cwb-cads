import { createLazyFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'

import { discoursemeQueryOptions } from '@/lib/queries'
import { AppPageFrame } from '@/components/app-page-frame'

export const Route = createLazyFileRoute('/_app/discoursemes/$discoursemeId')({
  component: SingleDiscourseme,
})

function SingleDiscourseme() {
  const { discoursemeId } = Route.useParams()
  const { data: query } = useSuspenseQuery(
    discoursemeQueryOptions(discoursemeId),
  )
  return (
    <AppPageFrame title="Discourseme">
      <div className="mono whitespace-pre rounded-md bg-muted p-2 text-sm leading-tight text-muted-foreground">
        {JSON.stringify(query, null, 2)}
      </div>
    </AppPageFrame>
  )
}

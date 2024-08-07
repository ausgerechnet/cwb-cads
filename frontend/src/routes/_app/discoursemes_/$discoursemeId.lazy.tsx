import { createLazyFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'

import { discoursemeById, discoursemeDescriptionsById } from '@/lib/queries'
import { AppPageFrame } from '@/components/app-page-frame'

export const Route = createLazyFileRoute('/_app/discoursemes/$discoursemeId')({
  component: SingleDiscourseme,
})

function SingleDiscourseme() {
  const discoursemeId = parseInt(Route.useParams().discoursemeId)
  const { data: query } = useSuspenseQuery(discoursemeById(discoursemeId))
  const { data: queryDescriptions } = useSuspenseQuery(
    discoursemeDescriptionsById(discoursemeId),
  )
  return (
    <AppPageFrame title="Discourseme">
      <div className="mono whitespace-pre rounded-md bg-muted p-2 text-sm leading-tight text-muted-foreground">
        {JSON.stringify(query, null, 2)}
        {JSON.stringify(queryDescriptions, null, 2)}
      </div>
    </AppPageFrame>
  )
}

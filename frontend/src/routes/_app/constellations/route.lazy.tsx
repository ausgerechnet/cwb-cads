import { useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute } from '@tanstack/react-router'

import { AppPageFrame } from '@/components/app-page-frame'
import { constellationListQueryOptions } from '@/lib/queries'

export const Route = createLazyFileRoute('/_app/constellations')({
  component: ConstellationOverview,
})

function ConstellationOverview() {
  const { data } = useSuspenseQuery(constellationListQueryOptions)
  return (
    <AppPageFrame
      title="Constellations"
      cta={{
        nav: {
          to: '/constellations/new',
        },
        label: 'Create Constellation',
      }}
    >
      <div className="whitespace-pre-line rounded-md bg-muted p-4 font-mono text-sm leading-tight text-muted-foreground">
        {JSON.stringify(data, null, 2)}
      </div>
    </AppPageFrame>
  )
}

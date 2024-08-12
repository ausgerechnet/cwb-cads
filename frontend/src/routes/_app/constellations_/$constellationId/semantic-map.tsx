import { z } from 'zod'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { cn } from '@/lib/utils.ts'

import { buttonVariants } from '@/components/ui/button.tsx'
import { FilterSchema } from '@/routes/_app/constellations_/$constellationId/-use-filter-selection.ts'

export const Route = createFileRoute(
  '/_app/constellations/$constellationId/semantic-map',
)({
  validateSearch: FilterSchema.extend({
    focusDiscourseme: z.number().optional().catch(undefined),
  }),
  component: SemanticMap,
})

function SemanticMap() {
  const constellationId = parseInt(Route.useParams().constellationId)

  return (
    <div className="-mx-2 flex-grow bg-muted">
      <Link
        to="/constellations/$constellationId"
        from="/constellations/$constellationId/semantic-map"
        params={{ constellationId: constellationId.toString() }}
        search={(s) => s}
        className={cn(
          buttonVariants({ variant: 'link' }),
          'top-42 absolute right-2 z-10 px-2',
        )}
      >
        <ArrowLeftIcon />
      </Link>
      Semantic Map
    </div>
  )
}

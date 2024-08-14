import { z } from 'zod'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { cn } from '@/lib/utils.ts'

import { buttonVariants } from '@/components/ui/button.tsx'
import {
  FilterSchema,
  useFilterSelection,
} from '@/routes/_app/constellations_/$constellationId/-use-filter-selection.ts'
import { useQuery } from '@tanstack/react-query'
import { constellationDescriptionFor } from '@/lib/queries.ts'

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
  const { description } = useDescription()

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
      {description && description.semantic_map_id === undefined ? (
        <>
          <br />
          no semantic map ID in description:-/
        </>
      ) : (
        ''
      )}
      <div className="whitespace-pre p-4 font-mono">
        {JSON.stringify(description ?? 'no description (yet?)', null, 2)}
      </div>
    </div>
  )
}

// TODO: this is more or less the same as in the route.tsx file. maybe pass its data via context?
function useDescription() {
  const constellationId = parseInt(Route.useParams().constellationId)
  const { corpusId } = Route.useSearch()
  const { secondary, s } = useFilterSelection(
    '/_app/constellations/$constellationId/semantic-map',
    corpusId,
  )
  const {
    data: description,
    isLoading: isLoadingDescription,
    error: errorDescription,
  } = useQuery({
    ...constellationDescriptionFor({
      constellationId,
      corpusId: corpusId!,
      subcorpusId: undefined,
      p: secondary,
      s,
      matchStrategy: 'longest',
    }),
    enabled:
      corpusId !== undefined && secondary !== undefined && s !== undefined,
  })
  return { description, isLoadingDescription, errorDescription }
}

import { useFilterSelection } from '@/routes/_app/constellations_/$constellationId/-use-filter-selection.ts'
import { useQuery } from '@tanstack/react-query'
import { constellationDescriptionFor } from '@/lib/queries.ts'
import { Route } from '@/routes/_app/constellations_/$constellationId/route.lazy.tsx'

export function useDescription() {
  const constellationId = parseInt(Route.useParams().constellationId)
  const { corpusId } = Route.useSearch()
  console.log('use description corpus id', corpusId)
  const { secondary, s } = useFilterSelection(
    '/_app/constellations/$constellationId',
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
      s,
      matchStrategy: 'longest',
    }),
    enabled:
      corpusId !== undefined && secondary !== undefined && s !== undefined,
  })
  return { description, isLoadingDescription, errorDescription }
}

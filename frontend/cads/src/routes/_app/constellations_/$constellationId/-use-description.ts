import { useQuery } from '@tanstack/react-query'

import { constellationDescriptionFor } from '@cads/shared/queries'
import { useFilterSelection } from '@/routes/_app/constellations_/$constellationId/-use-filter-selection.ts'
import { Route } from '@/routes/_app/constellations_/$constellationId/route.lazy.tsx'

export function useDescription() {
  const constellationId = parseInt(Route.useParams().constellationId)
  const { secondary, s, corpusId, subcorpusId } = useFilterSelection(
    '/_app/constellations/$constellationId',
  )
  const {
    data: description,
    isLoading: isLoadingDescription,
    error: errorDescription,
  } = useQuery({
    ...constellationDescriptionFor({
      constellationId,
      corpusId: corpusId!,
      subcorpusId: subcorpusId,
      s,
      matchStrategy: 'longest',
    }),
    enabled:
      corpusId !== undefined && secondary !== undefined && s !== undefined,
  })
  return { description, isLoadingDescription, errorDescription }
}

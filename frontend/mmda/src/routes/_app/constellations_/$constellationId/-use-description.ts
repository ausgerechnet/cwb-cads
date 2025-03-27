import { useQuery } from '@tanstack/react-query'

import { constellationDescriptionFor } from '@cads/shared/queries'
import { useFilterSelection } from '@/routes/_app/constellations_/$constellationId/-use-filter-selection.ts'
import { Route } from '@/routes/_app/constellations_/$constellationId/route.lazy.tsx'

export function useDescription() {
  const constellationId = parseInt(Route.useParams().constellationId)
  const { secondary, clContextBreak, corpusId, subcorpusId } =
    useFilterSelection('/_app/constellations_/$constellationId')

  const {
    data: description,
    isLoading: isLoadingDescription,
    error: errorDescription,
  } = useQuery({
    ...constellationDescriptionFor({
      constellationId,
      corpusId: corpusId!,
      subcorpusId: subcorpusId,
      matchStrategy: 'longest',
      s: clContextBreak!,
    }),
    enabled:
      corpusId !== undefined &&
      secondary !== undefined &&
      clContextBreak !== undefined,
  })

  return {
    constellationId,
    description,
    isLoadingDescription,
    errorDescription,
  }
}

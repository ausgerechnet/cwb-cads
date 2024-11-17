import { useQuery, useQueries } from '@tanstack/react-query'

import {
  constellationDescriptionFor,
  discoursemeDescriptionBreakdown,
} from '@cads/shared/queries'
import { useFilterSelection } from '@/routes/_app/constellations_/$constellationId/-use-filter-selection.ts'
import { Route } from '@/routes/_app/constellations_/$constellationId/route.lazy.tsx'

export function useDescription() {
  const constellationId = parseInt(Route.useParams().constellationId)
  const { secondary, s, corpusId, subcorpusId } = useFilterSelection(
    '/_app/constellations_/$constellationId',
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
      matchStrategy: 'longest',
      s,
    }),
    enabled:
      corpusId !== undefined && secondary !== undefined && s !== undefined,
  })

  const { breakdowns, error } = useQueries({
    queries:
      description?.discourseme_descriptions.map((description) => ({
        ...discoursemeDescriptionBreakdown(
          description.discourseme_id,
          description.id,
          secondary as string,
        ),
        enabled: description.id !== undefined && secondary !== undefined,
      })) ?? [],
    combine: (results) => {
      if (results.some((result) => result.error)) {
        return {
          breakdowns: null,
          error: results.find((result) => result.error)?.error,
        }
      }
      if (results.some((result) => result.data === undefined))
        return { breakdowns: null, error: null }
      if (results.length !== description?.discourseme_descriptions.length) {
        console.warn('Breakdown queries length mismatch!')
        return { breakdowns: null, error: null }
      }
      const breakdowns = results.map((result, index) => ({
        items: result.data?.items.toSorted((a, b) =>
          a.item.localeCompare(b.item),
        ),
        // all items have the same nr_tokens
        nrTokens: result.data?.items[0]?.nr_tokens,
        discoursemeId:
          description!.discourseme_descriptions[index]!.discourseme_id,
      }))
      return { breakdowns, error: null }
    },
  })

  return {
    description,
    isLoadingDescription,
    errorDescription: errorDescription || error,
    breakdowns,
  }
}

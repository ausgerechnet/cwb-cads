import { useQuery } from '@tanstack/react-query'

import { getCollocationItems, queryCollocation } from '@cads/shared/queries'
import { type WordCloudWordIn } from '@/components/word-cloud-alt'
import { useFilterSelection } from '../../constellations_/$constellationId/-use-filter-selection'
import { Route } from './route'
import { useMemo } from 'react'

export function useCollocation() {
  const queryId = parseInt(Route.useParams().queryId)
  const {
    ccPageSize,
    ccPageNumber = 1,
    ccSortOrder,
    ccSortBy,
    secondary = 'lemma',
    windowSize,
  } = useFilterSelection('/_app/queries_/$queryId')

  const {
    // secondary = 'lemma',
    contextBreak = 's',
    filterItem,
    filterItemPAtt,
  } = Route.useSearch()

  const {
    data: collocation,
    error: errorCollocation,
    isLoading: isLoadingCollocation,
  } = useQuery({
    ...queryCollocation(queryId, secondary!, {
      semanticBreak: contextBreak,
      filterItem,
      filterItemPAtt,
      window: windowSize,
      semanticMapInit: true,
    }),
    enabled: Boolean(secondary),
    retry: 1,
  })

  const collocationId = collocation?.id
  const {
    data: collocationItems,
    isLoading: isLoadingItems,
    error: errorItems,
  } = useQuery({
    ...getCollocationItems(collocationId as number, {
      sortOrder: ccSortOrder,
      sortBy: ccSortBy,
      pageSize: ccPageSize,
      pageNumber: ccPageNumber,
    }),
    enabled: Boolean(collocationId),
  })

  const {
    data: mapItems,
    isLoading: isLoadingMapItems,
    error: errorMapItems,
  } = useQuery({
    ...getCollocationItems(collocationId as number, {
      sortOrder: 'descending',
      sortBy: ccSortBy,
      pageSize: 300,
      pageNumber: 1,
    }),
    enabled: Boolean(collocationId) && !isLoadingItems,
  })

  const isLoading = isLoadingCollocation || isLoadingItems || isLoadingMapItems

  const words = useMemo(
    () =>
      (mapItems?.items ?? []).map(
        ({ item, scaled_scores }): WordCloudWordIn => {
          const { x = 0, y = 0 } =
            mapItems?.coordinates.find((c) => c.item === item) ?? {}
          const score = scaled_scores?.find(
            (s) => s.measure === ccSortBy,
          )?.score
          if (score === undefined) {
            throw new Error(
              `Score not found for "${item}" for measure "${ccSortBy}"`,
            )
          }
          return { label: item, x, y, score }
        },
      ),
    [mapItems, ccSortBy],
  )

  return {
    collocation,
    collocationItems,
    words,
    semanticMapId: mapItems?.id,
    isLoading,
    errors: [errorCollocation, errorItems, errorMapItems],
  }
}

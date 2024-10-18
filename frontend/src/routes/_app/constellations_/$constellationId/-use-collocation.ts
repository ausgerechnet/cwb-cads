import { useFilterSelection } from '@/routes/_app/constellations_/$constellationId/-use-filter-selection.ts'
import { useQuery } from '@tanstack/react-query'
import {
  constellationCollocationItems,
  constellationCollocation,
} from '@/lib/queries.ts'

export function useCollocation(
  constellationId: number,
  descriptionId?: number,
  corpusId?: number,
) {
  const {
    ccFilterItem,
    secondary,
    s,
    windowSize,
    focusDiscourseme,
    ccPageSize,
    ccSortBy,
    ccSortOrder,
    ccPageNumber,
  } = useFilterSelection('/_app/constellations/$constellationId', corpusId)
  const {
    data: collocation,
    isLoading: isLoadingConstellation,
    error: errorCollocation,
  } = useQuery({
    ...constellationCollocation(constellationId, descriptionId!, {
      focusDiscoursemeId: focusDiscourseme!,
      filterItem: ccFilterItem!,
      filterItemPAttribute: secondary!,
      p: secondary!,
      sBreak: s!,
      window: windowSize,
    }),
    // keep previous data
    placeholderData: (p) => p,
    enabled:
      focusDiscourseme !== undefined &&
      descriptionId !== undefined &&
      s !== undefined &&
      secondary !== undefined,
    // && filterItem !== undefined,
  })
  const {
    data: collocationItems,
    isLoading: isLoadingItems,
    error: errorConstellation,
  } = useQuery({
    ...constellationCollocationItems(
      constellationId,
      descriptionId as number,
      collocation?.id as number,
      {
        sortBy: ccSortBy,
        sortOrder: ccSortOrder,
        pageSize: ccPageSize,
        pageNumber: ccPageNumber,
      },
    ),
    enabled: collocation?.id !== undefined && descriptionId !== undefined,
  })
  const {
    data: collocationItemsMap,
    isLoading: isLoadingItemsMap,
    error: errorConstellationMap,
  } = useQuery({
    ...constellationCollocationItems(
      constellationId,
      descriptionId as number,
      collocation?.id as number,
      {
        sortBy: ccSortBy,
        sortOrder: ccSortOrder,
        pageSize: 300,
        pageNumber: 1,
      },
    ),
    enabled: collocation?.id !== undefined && descriptionId !== undefined,
  })

  const isLoading =
    isLoadingItems || isLoadingConstellation || isLoadingItemsMap

  return {
    isLoading,
    error:
      errorCollocation ?? errorConstellation ?? errorConstellationMap ?? null,
    collocation,
    collocationItems,
    collocationItemsMap,
  }
}

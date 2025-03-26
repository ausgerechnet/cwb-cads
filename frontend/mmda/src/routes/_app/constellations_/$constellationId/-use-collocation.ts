import { useFilterSelection } from '@/routes/_app/constellations_/$constellationId/-use-filter-selection.ts'
import { useQuery } from '@tanstack/react-query'
import {
  constellationCollocationItems,
  constellationCollocation,
  constellationCollocationVisualisation,
} from '@cads/shared/queries'

export function useCollocation(
  constellationId: number,
  descriptionId?: number,
) {
  const {
    secondary,
    clContextBreak,
    windowSize,
    focusDiscourseme,
    ccFilterDiscoursemeIds,
    ccPageSize,
    ccSortBy,
    ccSortOrder,
    ccPageNumber,
  } = useFilterSelection('/_app/constellations_/$constellationId')
  const {
    data: collocation,
    isLoading: isLoadingConstellation,
    isFetching: isFetchingConstellation,
    error: errorCollocation,
  } = useQuery({
    ...constellationCollocation(constellationId, descriptionId!, {
      focusDiscoursemeId: focusDiscourseme!,
      p: secondary!,
      sBreak: clContextBreak!,
      window: windowSize,
      filterDiscoursemeIds: ccFilterDiscoursemeIds,
    }),
    // keep previous data
    placeholderData: (p) => p,
    enabled:
      focusDiscourseme !== undefined &&
      descriptionId !== undefined &&
      clContextBreak !== undefined &&
      secondary !== undefined,
  })

  const {
    data: collocationItems,
    isLoading: isLoadingItem,
    isFetching: isFetchingItems,
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
    data: mapItems,
    isLoading: isLoadingItemsMap,
    isFetching: isFetchingItemsMap,
    error: errorConstellationMap,
  } = useQuery({
    ...constellationCollocationVisualisation(
      constellationId,
      descriptionId as number,
      collocation?.id as number,
      {
        sortBy: ccSortBy,
        sortOrder: ccSortOrder,
      },
    ),
    enabled:
      collocation?.id !== undefined &&
      descriptionId !== undefined &&
      !isFetchingItems,
  })

  const isLoading = isLoadingConstellation || isLoadingItemsMap || isLoadingItem
  const isFetching =
    isFetchingConstellation || isFetchingItemsMap || isFetchingItems

  return {
    isLoading,
    isFetching,
    error:
      errorCollocation ?? errorConstellationMap ?? errorConstellation ?? null,
    collocation,
    collocationItems,
    mapItems,
  }
}

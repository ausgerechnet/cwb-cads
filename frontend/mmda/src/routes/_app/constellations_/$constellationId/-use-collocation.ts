import { useFilterSelection } from '@/routes/_app/constellations_/$constellationId/-use-filter-selection.ts'
import { useQuery } from '@tanstack/react-query'
import {
  constellationCollocationItems,
  constellationCollocation,
  constellationCollocationVisualisation,
  constellationCollocationMap,
} from '@cads/shared/queries'

export function useCollocation(
  constellationId: number,
  descriptionId?: number,
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
  } = useFilterSelection('/_app/constellations_/$constellationId')
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
    isLoading: isLoadingItem,
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
    enabled: collocation?.id !== undefined && descriptionId !== undefined,
  })

  const {
    data: mapData,
    isLoading: isLoadingMap,
    error: errorMap,
  } = useQuery({
    ...constellationCollocationMap(
      constellationId,
      descriptionId as number,
      collocation?.id as number,
      {
        sortBy: ccSortBy,
        sortOrder: ccSortOrder,
      },
    ),
    enabled: collocation?.id !== undefined && descriptionId !== undefined,
  })
  // console.log('map data', mapData)

  const isLoading =
    isLoadingConstellation || isLoadingItemsMap || isLoadingItem || isLoadingMap

  return {
    isLoading,
    error:
      errorCollocation ??
      errorConstellationMap ??
      errorMap ??
      errorConstellation ??
      null,
    collocation,
    collocationItems,
    mapItems,
    mapData,
  }
}

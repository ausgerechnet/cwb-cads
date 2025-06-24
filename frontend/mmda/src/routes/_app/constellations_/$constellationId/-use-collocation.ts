import { useRouterState } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  constellationCollocationItems,
  constellationCollocation,
  constellationCollocationVisualisation,
} from '@cads/shared/queries'
import { useFilterSelection } from './-use-filter-selection.ts'
import { Route } from './route.tsx'

export function useCollocation(descriptionId?: number) {
  const constellationId = parseInt(Route.useParams().constellationId)
  const showsSemanticMap =
    useRouterState().matches.find((match) =>
      match.routeId.endsWith('semantic-map'),
    ) !== undefined

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
    isLoading: isLoadingItems,
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
      !isLoadingItems &&
      showsSemanticMap,
  })

  const isLoading =
    isLoadingConstellation || isLoadingItemsMap || isLoadingItems
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

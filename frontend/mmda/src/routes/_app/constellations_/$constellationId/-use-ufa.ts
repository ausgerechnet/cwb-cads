import { useQuery } from '@tanstack/react-query'

import {
  constellationCollocationItems,
  constellationDescriptionCollection,
  constellationDescriptionCollectionCollocation,
  constellationCollocationVisualisation,
  constellationDescription,
} from '@cads/shared/queries'
import { useConcordanceFilterContext } from '@cads/shared/components/concordances'

import { useFilterSelection } from './-use-filter-selection'
import { useAnalysisSelection } from './-use-analysis-selection'
import { Route } from './route'

export function useUfa() {
  const { ccPageSize, ccPageNumber, ccSortOrder, ccSortBy } =
    useFilterSelection('/_app/constellations_/$constellationId')
  const constellationId = parseInt(Route.useParams().constellationId)
  let { ufaTimeSpan } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { analysisSelection } = useAnalysisSelection()
  const { clContextBreak, windowSize } = useConcordanceFilterContext()
  const partition =
    analysisSelection?.analysisType === 'ufa'
      ? analysisSelection.partition
      : undefined
  const { focusDiscourseme, analysisLayer } = analysisSelection ?? {}

  function setUfaTimeSpan(ufaTimeSpan: string) {
    navigate({
      to: '.',
      search: (s) => ({ ...s, ufaTimeSpan }),
      params: (p) => p,
    })
  }

  const { data: collection, error: errorCollection } = useQuery({
    ...constellationDescriptionCollection(
      constellationId,
      clContextBreak!,
      partition!,
    ),
    enabled: clContextBreak !== undefined && partition !== undefined,
  })
  const collectionId = collection?.id

  const filterDiscoursemeIds: number[] = []

  const {
    data: collectionDescriptions,
    error: errorCollectionDescriptions,
    isLoading: isLoadingDescriptions,
  } = useQuery({
    ...constellationDescriptionCollectionCollocation(
      constellationId,
      collectionId!,
      {
        filterDiscoursemeIds,
        filterItem: undefined,
        filterItemPAtt: undefined,
        focusDiscoursemeId: focusDiscourseme!,
        p: analysisLayer!,
        sBreak: clContextBreak!,
        window: windowSize,
      },
    ),
    retry: 0,
    enabled:
      collectionId !== undefined &&
      clContextBreak !== undefined &&
      collectionId !== undefined &&
      focusDiscourseme !== undefined &&
      analysisLayer !== undefined,
  })

  const possibleTimeSpans: string[] =
    collectionDescriptions?.ufa
      ?.map(({ x_label }) => x_label)
      .filter((s): s is string => typeof s === 'string') ?? []
  ufaTimeSpan = defaultValue(possibleTimeSpans, ufaTimeSpan)

  const selectedTimeSpan = collectionDescriptions?.ufa?.find(
    ({ x_label }) => x_label === ufaTimeSpan,
  )
  const ufaCollocationId = selectedTimeSpan?.collocation_id_right ?? undefined
  const ufaDescriptionId = selectedTimeSpan?.description_id_right ?? undefined

  const {
    data: collocationItems,
    isLoading: isLoadingItem,
    isFetching: isFetchingItems,
    error: errorConstellation,
  } = useQuery({
    ...constellationCollocationItems(
      constellationId,
      ufaDescriptionId as number,
      ufaCollocationId as number,
      {
        sortBy: ccSortBy,
        sortOrder: ccSortOrder,
        pageSize: ccPageSize,
        pageNumber: ccPageNumber,
      },
    ),
    enabled: ufaCollocationId !== undefined && ufaDescriptionId !== undefined,
  })

  const {
    data: mapItems,
    isLoading: isLoadingItemsMap,
    isFetching: isFetchingItemsMap,
    error: errorConstellationMap,
  } = useQuery({
    ...constellationCollocationVisualisation(
      constellationId,
      ufaDescriptionId as number,
      ufaCollocationId as number,
      {
        sortBy: ccSortBy,
        sortOrder: ccSortOrder,
      },
    ),
    enabled:
      ufaDescriptionId !== undefined &&
      ufaCollocationId !== undefined &&
      !isFetchingItems,
  })

  console.log('ufa description id', ufaDescriptionId)

  const {
    data: description,
    isLoading: isLoadingDescription,
    error: errorDescription,
  } = useQuery({
    ...constellationDescription(constellationId, ufaDescriptionId as number),
    enabled: ufaDescriptionId !== undefined,
  })

  const isLoading =
    isLoadingItem ||
    isLoadingItemsMap ||
    isLoadingDescriptions ||
    isLoadingDescription

  return {
    errors: [
      errorConstellation,
      errorCollection,
      errorCollectionDescriptions,
      errorConstellationMap,
      errorDescription,
    ].filter(Boolean),
    collectionDescriptions,
    isLoading,
    isFetching: isFetchingItems || isFetchingItemsMap,

    collocationItems,
    mapItems,
    description,

    ufaTimeSpan,
    setUfaTimeSpan,
    ufaCollocationId,
    ufaDescriptionId,
  }
}

function defaultValue<T>(
  legalValues: (T | undefined)[] | undefined,
  ...potentialValues: (T | undefined)[]
): T | undefined {
  if (!legalValues) {
    return undefined
  }
  for (const value of potentialValues) {
    if (legalValues.includes(value)) {
      return value
    }
  }
  return legalValues[0]
}

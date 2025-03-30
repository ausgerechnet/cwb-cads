import { useQuery } from '@tanstack/react-query'

import {
  constellationCollocationItems,
  constellationDescriptionCollection,
  constellationDescriptionCollectionCollocation,
  constellationCollocationVisualisation,
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

  function setUfaTimeSpan(ufaTimeSpan: string) {
    navigate({
      to: '.',
      search: (s) => ({ ...s, ufaTimeSpan }),
      params: (p) => p,
    })
  }

  if (analysisSelection?.analysisType !== 'ufa') {
    throw new Error('Invalid analysis type')
  }

  const { data: collection, error: errorCollection } = useQuery({
    ...constellationDescriptionCollection(
      constellationId,
      clContextBreak!,
      analysisSelection.partition,
    ),
    enabled: clContextBreak !== undefined,
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
        focusDiscoursemeId: analysisSelection.focusDiscourseme,
        p: analysisSelection.analysisLayer,
        sBreak: clContextBreak!,
        window: windowSize,
      },
    ),
    retry: 0,
    enabled:
      collectionId !== undefined &&
      clContextBreak !== undefined &&
      collectionId !== undefined,
  })

  const possibleTimeSpans: string[] =
    collectionDescriptions?.ufa
      ?.map(({ x_label }) => x_label)
      .filter((s): s is string => typeof s === 'string') ?? []
  ufaTimeSpan = defaultValue(possibleTimeSpans, ufaTimeSpan)

  const selectedTimeSpan = collectionDescriptions?.ufa?.find(
    ({ x_label }) => x_label === ufaTimeSpan,
  )
  let ufaCollocationId = undefined
  let ufaDescriptionId = undefined
  if (selectedTimeSpan) {
    ufaCollocationId = selectedTimeSpan.collocation_id_right ?? undefined
    ufaDescriptionId = selectedTimeSpan.description_id_right ?? undefined
  }

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

  const isLoading = isLoadingItem || isLoadingItemsMap || isLoadingDescriptions

  return {
    errors: [
      errorConstellation,
      errorCollection,
      errorCollectionDescriptions,
      errorConstellationMap,
    ].filter(Boolean),
    collectionDescriptions,
    isLoading,
    isFetching: isFetchingItems || isFetchingItemsMap,

    collocationItems,
    mapItems,

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

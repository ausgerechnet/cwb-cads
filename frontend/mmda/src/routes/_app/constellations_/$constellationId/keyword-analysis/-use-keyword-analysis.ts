import { useQuery } from '@tanstack/react-query'

import {
  constellationKeywordAnalysis,
  constellationKeywordAnalysisMap,
} from '@cads/shared/queries'

import { useFilterSelection } from '../-use-filter-selection'
import { useDescription } from '../-use-description'
import { useKeywordSelection } from './-use-keyword-selection'
import { Route } from './route'

export function useKeywordAnalysis() {
  const constellationId = parseInt(Route.useParams().constellationId)
  const {
    analysisLayer,
    referenceLayer,
    referenceCorpusId,
    referenceSubcorpusId,
  } = useKeywordSelection()
  const { description } = useDescription()
  const { id: descriptionId } = description || {}
  const { ccSortBy } = useFilterSelection(
    '/_app/constellations_/$constellationId',
  )
  const {
    data: { id: keywordId } = {},
    error: errorKeyword,
    isFetching: isFetchingKeyword,
  } = useQuery({
    ...constellationKeywordAnalysis(constellationId, descriptionId!, {
      corpusIdReference: referenceCorpusId!,
      subcorpusIdReference: referenceSubcorpusId!,
      p: analysisLayer!,
      pReference: referenceLayer!,
    }),
    retry: 0,
    enabled:
      descriptionId !== undefined &&
      referenceCorpusId !== undefined &&
      analysisLayer !== undefined &&
      referenceLayer !== undefined,
  })

  const {
    data: mapItems,
    error: errorItems,
    isFetching: isFetchingItems,
  } = useQuery({
    ...constellationKeywordAnalysisMap(
      constellationId,
      descriptionId!,
      keywordId!,
      ccSortBy,
    ),
    enabled: descriptionId !== undefined && keywordId !== undefined,
  })

  return {
    errors: [errorKeyword, errorItems].filter(Boolean),
    keywordId,
    mapItems,
    isFetching: isFetchingKeyword || isFetchingItems,
  }
}

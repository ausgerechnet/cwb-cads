import { useQuery } from '@tanstack/react-query'

import {
  constellationKeywordAnalysis,
  constellationKeywordAnalysisMap,
} from '@cads/shared/queries'

import { useFilterSelection } from './-use-filter-selection'
import { useAnalysisSelection } from './-use-analysis-selection'
import { useDescription } from './-use-description'

export function useKeywordAnalysis() {
  const { constellationId, description: { id: descriptionId } = {} } =
    useDescription()
  const { ccSortBy } = useFilterSelection(
    '/_app/constellations_/$constellationId',
  )
  const analysisSelection = useAnalysisSelection().analysisSelection

  let p: string | undefined
  let pReference: string | undefined
  let corpusIdReference: number | undefined
  let subcorpusIdReference: number | undefined

  if (analysisSelection?.analysisType === 'keyword') {
    p = analysisSelection.analysisLayer
    pReference = analysisSelection.referenceLayer
    corpusIdReference = analysisSelection.referenceCorpusId
    subcorpusIdReference = analysisSelection.referenceSubcorpusId
  }

  const {
    data: { id: keywordId } = {},
    error: errorKeyword,
    isFetching: isFetchingKeyword,
  } = useQuery({
    ...constellationKeywordAnalysis(constellationId, descriptionId!, {
      corpusIdReference: corpusIdReference!,
      subcorpusIdReference: subcorpusIdReference!,
      p: p!,
      pReference: pReference!,
    }),
    retry: 0,
    enabled:
      descriptionId !== undefined &&
      analysisSelection?.analysisType === 'keyword',
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
    enabled:
      descriptionId !== undefined &&
      analysisSelection?.analysisType === 'keyword' &&
      keywordId !== undefined,
  })

  return {
    errors: [errorKeyword, errorItems].filter(Boolean),
    keywordId,
    mapItems,
    isFetching: isFetchingKeyword || isFetchingItems,
  }
}

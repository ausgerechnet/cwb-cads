import { useQuery } from '@tanstack/react-query'

import {
  constellationKeywordAnalysis,
  constellationKeywordAnalysisMap,
} from '@cads/shared/queries'

import { useAnalysisSelection } from './-use-analysis-selection'
import { useDescription } from './-use-description'

export function useKeywordAnalysis() {
  const { constellationId, description: { id: descriptionId } = {} } =
    useDescription()
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

  const { data: { id: keywordId } = {}, error: errorKeyword } = useQuery({
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

  const { data: mapItems, error: errorItems } = useQuery({
    ...constellationKeywordAnalysisMap(
      constellationId,
      descriptionId!,
      keywordId!,
      'conservative_log_ratio',
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
  }
}

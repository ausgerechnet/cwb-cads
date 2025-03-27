import { useQuery } from '@tanstack/react-query'

import { constellationKeywordAnalysis } from '@cads/shared/queries'

import { useAnalysisSelection } from './-use-analysis-selection'
import { useDescription } from './-use-description'

export function useKeywordAnalysis() {
  const { constellationId, description: { id: descriptionId } = {} } =
    useDescription()
  const analysisSelection = useAnalysisSelection().analysisSelection
  console.log('descriptionId', descriptionId)

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

  return useQuery({
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
}

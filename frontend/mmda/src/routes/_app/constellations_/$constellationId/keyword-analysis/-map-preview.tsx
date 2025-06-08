import { WordCloudLink } from '@/components/word-cloud-link'
import { ErrorMessage } from '@cads/shared/components/error-message'

import { useKeywordSelection } from './-use-keyword-selection'
import { useKeywordAnalysis } from './-use-keyword-analysis'
import { Route } from './route'

export function KeywordMapPreview() {
  const constellationId = Route.useParams().constellationId
  const { analysisLayer, corpusId, referenceCorpusId, referenceLayer } =
    useKeywordSelection()
  const { errors, mapItems } = useKeywordAnalysis()

  if (errors.length) {
    return <ErrorMessage error={errors} />
  }

  return (
    <WordCloudLink
      to="/constellations/$constellationId/keyword-analysis/semantic-map"
      from="/constellations/$constellationId/keyword-analysis"
      params={{ constellationId: constellationId.toString() }}
      search={(s) => s}
      items={mapItems?.map ?? []}
      warn={
        corpusId !== undefined &&
        analysisLayer !== undefined &&
        referenceCorpusId !== undefined &&
        referenceLayer !== undefined
          ? null
          : `Select a corpus, layer and reference layer`
      }
    />
  )
}

import { ErrorMessage } from '@cads/shared/components/error-message'
import { WordCloudLink } from '@/components/word-cloud-link'

import { useDescription } from '../-use-description'
import { useCollocationSelection } from './-use-collocation-selection'
import { useCollocation } from '../-use-collocation'
import { Route } from './route'

export function CollocationMapPreview() {
  const constellationId = parseInt(Route.useParams().constellationId)
  const { corpusId, contextBreak, analysisLayer, focusDiscourseme } =
    useCollocationSelection()
  const descriptionId = useDescription()?.description?.id
  const { mapItems, error } = useCollocation(descriptionId)

  if (error) {
    return <ErrorMessage error={error} />
  }

  return (
    <WordCloudLink
      to="/constellations/$constellationId/collocation-analysis/semantic-map"
      from="/constellations/$constellationId/collocation-analysis"
      params={{ constellationId: constellationId.toString() }}
      search={(s) => s}
      items={mapItems?.map}
      warn={
        corpusId === undefined ||
        contextBreak === undefined ||
        analysisLayer === undefined ||
        focusDiscourseme === undefined
          ? `Select a corpus, layer and focus discourseme`
          : null
      }
    />
  )
}

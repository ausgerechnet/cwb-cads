import { ErrorMessage } from '@cads/shared/components/error-message'
import { WordCloudLink } from '@/components/word-cloud-link'

import { Route } from './route'
import { useUfaSelection } from './-use-ufa-selection'
import { useUfa } from './-use-ufa'

export function UfaMapPreview() {
  const { constellationId } = Route.useParams()
  const { corpusId, analysisLayer, focusDiscourseme, partition } =
    useUfaSelection()
  const isValidSelection =
    corpusId !== undefined &&
    analysisLayer !== undefined &&
    focusDiscourseme !== undefined &&
    partition !== undefined
  const { mapItems, errors } = useUfa()

  if (errors.length) {
    return <ErrorMessage error={errors} />
  }

  return (
    <WordCloudLink
      to="/constellations/$constellationId/ufa/semantic-map"
      from="/constellations/$constellationId/ufa"
      params={{ constellationId }}
      search={(s) => s}
      items={mapItems?.map ?? []}
      warn={
        isValidSelection
          ? null
          : `Select a corpus, layer, focus discourseme and subcorpus collection`
      }
    />
  )
}

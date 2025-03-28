import { ComponentProps } from 'react'

import { WordCloudLink } from '@/components/word-cloud-link'

import { useAnalysisSelection } from './-use-analysis-selection'
import { useCollocation } from './-use-collocation'
import { Route } from './route'

export function SemanticMapLink() {
  const analysisType = useAnalysisSelection().analysisType

  if (analysisType === 'collocation') {
    return <CollocationLink />
  }

  if (analysisType === 'keyword') {
    return <KeywordLink />
  }

  if (analysisType === 'ufa') {
    return <UfaLink />
  }
}

function CollocationLink({ descriptionId }: { descriptionId?: number }) {
  const constellationId = parseInt(Route.useParams().constellationId)
  const { analysisSelection } = useAnalysisSelection()
  const { mapItems } = useCollocation(constellationId, descriptionId)

  return (
    <MapLink
      items={mapItems?.map}
      warn={
        analysisSelection
          ? null
          : `Select a corpus, layer and focus discourseme`
      }
    />
  )
}

function KeywordLink() {
  const { analysisSelection } = useAnalysisSelection()
  return (
    <MapLink
      items={[]}
      warn={
        analysisSelection ? null : `Select a corpus, layer and reference layer`
      }
    />
  )
}

function UfaLink() {
  const { analysisSelection } = useAnalysisSelection()
  return (
    <MapLink
      items={[]}
      warn={
        analysisSelection
          ? null
          : `Select a corpus, layer, focus discourseme and subcorpus collection`
      }
    />
  )
}

function MapLink({
  warn,
  items,
}: Pick<ComponentProps<typeof WordCloudLink>, 'warn' | 'items'>) {
  const constellationId = parseInt(Route.useParams().constellationId)
  return (
    <WordCloudLink
      to="/constellations/$constellationId/semantic-map"
      from="/constellations/$constellationId"
      params={{ constellationId: constellationId.toString() }}
      search={(s) => s}
      items={items}
      warn={warn}
    />
  )
}

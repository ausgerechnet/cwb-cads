import { ComponentProps } from 'react'

import { ErrorMessage } from '@cads/shared/components/error-message'
import { WordCloudLink } from '@/components/word-cloud-link'

import { Route } from './route'
import { useAnalysisSelection } from './-use-analysis-selection'
import { useCollocation } from './-use-collocation'
import { useDescription } from './-use-description'
import { useKeywordAnalysis } from './-use-keyword-analysis'
import { useUfa } from './-use-ufa'

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

function CollocationLink() {
  const constellationId = parseInt(Route.useParams().constellationId)
  const { analysisSelection } = useAnalysisSelection()
  const descriptionId = useDescription()?.description?.id
  const { mapItems, error } = useCollocation(constellationId, descriptionId)

  if (error) {
    return <ErrorMessage error={error} />
  }

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
  const { errors, mapItems } = useKeywordAnalysis()

  if (errors.length) {
    return <ErrorMessage error={errors} />
  }

  return (
    <MapLink
      items={mapItems?.map ?? []}
      warn={
        analysisSelection ? null : `Select a corpus, layer and reference layer`
      }
    />
  )
}

function UfaLink() {
  const { analysisSelection } = useAnalysisSelection()
  const { mapItems, errors } = useUfa()

  if (errors.length) {
    return <ErrorMessage error={errors} />
  }

  return (
    <MapLink
      items={mapItems?.map ?? []}
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

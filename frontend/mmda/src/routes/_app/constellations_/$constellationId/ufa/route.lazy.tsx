import { createLazyFileRoute } from '@tanstack/react-router'

import { ConstellationConcordanceLinesUfa } from './-concordance-lines'
import { ConstellationLayout } from '../-constellation-layout'
import { UfaSelection } from './-selection'
import { UfaMapPreview } from './-map-preview'
import { TimeSelect } from './-time-selection'
import { SemanticMapUfa } from './-semantic-map'
import { useUfaSelection } from './-use-ufa-selection'

export const Route = createLazyFileRoute(
  '/_app/constellations_/$constellationId/ufa',
)({ component: Ufa })

function Ufa() {
  const { isValidSelection } = useUfaSelection()
  return (
    <ConstellationLayout
      selectionContent={<UfaSelection />}
      drawerContent={<ConstellationConcordanceLinesUfa />}
      mapPreviewContent={<UfaMapPreview />}
      mapContent={<SemanticMapUfa />}
    >
      {isValidSelection && <TimeSelect />}
    </ConstellationLayout>
  )
}

import { createLazyFileRoute } from '@tanstack/react-router'

import { ConstellationLayout } from '../-constellation-layout'
import { CollocationSelection } from './-selection'
import { CollocationMapPreview } from './-map-preview'
import { CollocationSemanticMap } from './-semantic-map'
import { CollocationTable } from './-collocation-table'
import { ConstellationConcordanceLines } from './-concordance-lines'
import { ConstellationCollocationFilter } from '../-constellation-filter'
import { useCollocationSelection } from './-use-collocation-selection'
import { useDescription } from '../-use-description'

export const Route = createLazyFileRoute(
  '/_app/constellations_/$constellationId/collocation-analysis',
)({
  component: CollocationAnalysis,
})

function CollocationAnalysis() {
  const descriptionId = useDescription().description?.id
  const { isValidSelection } = useCollocationSelection()

  return (
    <ConstellationLayout
      selectionContent={<CollocationSelection />}
      mapPreviewContent={<CollocationMapPreview />}
      mapContent={<CollocationSemanticMap />}
      drawerContent={<ConstellationConcordanceLines />}
    >
      {descriptionId !== undefined && isValidSelection && (
        <>
          <div className="mb-5 flex items-center gap-4">
            <ConstellationCollocationFilter />
          </div>

          <CollocationTable descriptionId={descriptionId} />
        </>
      )}
    </ConstellationLayout>
  )
}

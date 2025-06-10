import { createLazyFileRoute } from '@tanstack/react-router'

import { ConstellationLayout } from '../-constellation-layout'

import { ConstellationCollocationFilter } from '../-constellation-filter'
import { ConstellationConcordanceLinesKeyword } from './-concordance-lines'
import { KeywordMapPreview } from './-map-preview'
import { KeywordSelection } from './-selection'
import { useKeywordSelection } from './-use-keyword-selection'
import { KeywordTable } from './-keyword-table'
import { KeywordSemanticMap } from './-semantic-map'

export const Route = createLazyFileRoute(
  '/_app/constellations_/$constellationId/keyword-analysis',
)({
  component: KeywordAnalysis,
})

function KeywordAnalysis() {
  const { isValidSelection } = useKeywordSelection()
  return (
    <ConstellationLayout
      selectionContent={<KeywordSelection />}
      mapPreviewContent={<KeywordMapPreview />}
      mapContent={<KeywordSemanticMap />}
      drawerContent={<ConstellationConcordanceLinesKeyword />}
    >
      {isValidSelection ? (
        <>
          <ConstellationCollocationFilter hideWindowSize className="mb-5" />
          <KeywordTable />
        </>
      ) : null}
    </ConstellationLayout>
  )
}

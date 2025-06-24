import { createFileRoute } from '@tanstack/react-router'
import { ConstellationLayout } from '../-constellation-layout'
import { BreakdownSelection } from './-selection'
import {
  BreakdownAnalysisSchema,
  useBreakdownSelection,
} from './-use-breakdown-selection'
import { BreakdownTable } from './-breakdown-table'

export const Route = createFileRoute(
  '/_app/constellations_/$constellationId/breakdown',
)({
  validateSearch: BreakdownAnalysisSchema,
  component: Breakdown,
})

function Breakdown() {
  const { isValidSelection } = useBreakdownSelection()
  return (
    <ConstellationLayout
      selectionContent={<BreakdownSelection />}
      drawerContent={
        <div className="text-muted-foreground flex h-52 w-full items-center justify-center text-center">
          Concordance lines are not available in breakdown view.
        </div>
      }
    >
      {isValidSelection && <BreakdownTable />}
    </ConstellationLayout>
  )
}

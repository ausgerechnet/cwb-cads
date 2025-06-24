import { createLazyFileRoute } from '@tanstack/react-router'
import { Card } from '@cads/shared/components/ui/card'
import { ConstellationLayout } from '../-constellation-layout'
import { AssociationsSelection } from './-selection'
import { DescriptionAssociations } from './-description-associations'
import { useAssociationsSelection } from './-use-associations-selection'

export const Route = createLazyFileRoute(
  '/_app/constellations_/$constellationId/associations',
)({
  component: Associations,
})

function Associations() {
  const { isSelectionValid } = useAssociationsSelection()
  return (
    <ConstellationLayout
      selectionContent={<AssociationsSelection />}
      drawerContent={
        <div className="text-muted-foreground flex h-52 w-full items-center justify-center text-center">
          Concordance lines are not available in associations view.
        </div>
      }
    >
      {isSelectionValid && (
        <Card className="p-4">
          <DescriptionAssociations />
        </Card>
      )}
    </ConstellationLayout>
  )
}

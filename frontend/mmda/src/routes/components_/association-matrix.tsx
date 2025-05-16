import { createFileRoute } from '@tanstack/react-router'
import { AssociationMatrix } from '@cads/shared/components/association-matrix'
import { Block } from './-block'

export const Route = createFileRoute('/components_/association-matrix')({
  component: AssociationMatrixComponents,
})

function AssociationMatrixComponents() {
  return (
    <Block componentName="AssociationMatrix" componentTag="AssociationMatrix">
      <AssociationMatrix
        legendNameMap={
          new Map([
            [0, 'Anchor'],
            [1, 'Boatride'],
            [2, 'Cruise'],
          ])
        }
        associations={[
          // measure 'something'
          {
            node: 0,
            candidate: 1,
            score: 0.5,
            scaledScore: 0.5,
            measure: 'something',
          },
          {
            node: 0,
            candidate: 2,
            score: 0.3,
            scaledScore: 0.5,
            measure: 'something',
          },
          {
            node: 1,
            candidate: 2,
            score: 0.8,
            scaledScore: 0.5,
            measure: 'something',
          },

          // measure 'anything'
          {
            node: 0,
            candidate: 1,
            score: -0.5,
            scaledScore: 0.5,
            measure: 'anything',
          },
          {
            node: 0,
            candidate: 2,
            score: 0.3,
            scaledScore: 0.5,
            measure: 'anything',
          },
          {
            node: 1,
            candidate: 2,
            score: 0.8,
            scaledScore: 0.5,
            measure: 'anything',
          },

          // measure 'everything'
          {
            node: 0,
            candidate: 1,
            score: 1_000,
            scaledScore: 0.5,
            measure: 'everything',
          },
          {
            node: 0,
            candidate: 2,
            score: 250,
            scaledScore: 0.5,
            measure: 'everything',
          },
          {
            node: 1,
            candidate: 2,
            score: 0,
            scaledScore: 0.5,
            measure: 'everything',
          },
        ]}
      />
    </Block>
  )
}

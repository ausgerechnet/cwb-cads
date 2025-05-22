import { createFileRoute } from '@tanstack/react-router'
import {
  MeasureSelect,
  useMeasureSelection,
} from '@cads/shared/components/measures'
import { Block } from './-block'

export const Route = createFileRoute('/components_/measure')({
  component: MeasureSelectOverview,
})

function MeasureSelectOverview() {
  const { selectedMeasures, measureNameMap } = useMeasureSelection()
  return (
    <Block componentTag="MeasureSelect">
      <MeasureSelect />
      <br />
      {selectedMeasures.map((m) => measureNameMap.get(m)).join(', ')}
    </Block>
  )
}

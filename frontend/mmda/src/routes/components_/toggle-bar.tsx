import { createFileRoute } from '@tanstack/react-router'
import { ToggleBar } from '@cads/shared/components/toggle-bar'
import { Block } from './-block'

export const Route = createFileRoute('/components_/toggle-bar')({
  component: ToggleBarComponents,
})

function ToggleBarComponents() {
  return (
    <Block componentTag="ToggleBar">
      <ToggleBar<'opt-1' | 'Option 2' | 'Option 3'>
        onChange={(value) => console.log('Selected:', value)}
        options={[['opt-1', 'Option 1'], 'Option 2', 'Option 3']}
        defaultValue="opt-1"
      />
    </Block>
  )
}

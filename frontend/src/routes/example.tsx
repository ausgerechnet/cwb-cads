import { FileRoute } from '@tanstack/react-router'

export const Route = new FileRoute('/example').createRoute({
  component: Example,
})

function Example() {
  return (
    <div className="p-2">
      <h3>Example</h3>
    </div>
  )
}

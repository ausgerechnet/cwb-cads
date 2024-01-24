import { FileRoute } from '@tanstack/react-router'

export const Route = new FileRoute('/vignette').createRoute({
  component: Example,
})

function Example() {
  return (
    <div className="p-2">
      <h3>Vignette</h3>
    </div>
  )
}

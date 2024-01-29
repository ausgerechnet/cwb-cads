import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vignette')({
  component: Example,
})

function Example() {
  return (
    <div className="p-2">
      <h3>Vignette</h3>
    </div>
  )
}

import { FileRoute } from '@tanstack/react-router'

export const Route = new FileRoute('/app/queries/new').createRoute({
  component: QueriesNew,
})

function QueriesNew() {
  return (
    <div className="p-2">
      <h3>Queries</h3>
    </div>
  )
}

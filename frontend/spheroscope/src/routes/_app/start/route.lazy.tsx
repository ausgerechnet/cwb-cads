import { useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute } from '@tanstack/react-router'
import { spheroscopeSlotQuery } from '@cads/shared/queries'
import { ErrorMessage } from '@cads/shared/components/error-message'

export const Route = createLazyFileRoute('/_app/start')({
  component: Start,
})

function Start() {
  const { data, error } = useSuspenseQuery(spheroscopeSlotQuery)
  return (
    <div>
      <h1>Start</h1>
      <ErrorMessage error={error} />
      {data.length} Queries
    </div>
  )
}

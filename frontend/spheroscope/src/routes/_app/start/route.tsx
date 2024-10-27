import { createFileRoute } from '@tanstack/react-router'
import { queryClient, spheroscopeSlotQuery } from '@cads/shared/queries'

export const Route = createFileRoute('/_app/start')({
  loader: () => queryClient.ensureQueryData(spheroscopeSlotQuery),
})

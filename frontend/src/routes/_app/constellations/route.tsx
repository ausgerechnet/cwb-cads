import { createFileRoute } from '@tanstack/react-router'
import { constellationListQueryOptions } from '@/lib/queries'

export const Route = createFileRoute('/_app/constellations')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(constellationListQueryOptions),
})

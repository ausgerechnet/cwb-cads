import { constellationQueryOptions } from '@/lib/queries'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/constellations/$constellationId')({
  loader: ({ context: { queryClient }, params: { constellationId } }) =>
    queryClient.ensureQueryData(constellationQueryOptions(constellationId)),
})

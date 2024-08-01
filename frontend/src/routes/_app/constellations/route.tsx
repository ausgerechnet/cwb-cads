import { createFileRoute } from '@tanstack/react-router'
import { constellationList } from '@/lib/queries'

export const Route = createFileRoute('/_app/constellations')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(constellationList),
})

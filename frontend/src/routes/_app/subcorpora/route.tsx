import { createFileRoute } from '@tanstack/react-router'
import { corporaQueryOptions } from '@/lib/queries'

export const Route = createFileRoute('/_app/subcorpora')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(corporaQueryOptions),
})

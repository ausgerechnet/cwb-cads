import { createFileRoute } from '@tanstack/react-router'
import { corporaQueryOptions } from '@/lib/queries'

export const Route = createFileRoute('/_app/subcorpora/new')({
  loader: async ({ context: { queryClient } }) => ({
    corpora: await queryClient.ensureQueryData(corporaQueryOptions),
  }),
})

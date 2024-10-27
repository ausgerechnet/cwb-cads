import { createFileRoute } from '@tanstack/react-router'
import { corpusList } from '@/lib/queries'

export const Route = createFileRoute('/_app/subcorpora/new')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(corpusList),
})

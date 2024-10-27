import { corpusList } from '@/queries/queries'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/corpora')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(corpusList),
})

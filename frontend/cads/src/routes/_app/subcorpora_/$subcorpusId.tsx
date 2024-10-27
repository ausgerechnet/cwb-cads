import { createFileRoute } from '@tanstack/react-router'
import { subcorporaList } from '@/queries/queries'

export const Route = createFileRoute('/_app/subcorpora/$subcorpusId')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(subcorporaList),
})

import { corpusList, subcorporaList } from '@/lib/queries'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/keyword-analysis/new')({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(subcorporaList),
      queryClient.ensureQueryData(corpusList),
    ]),
})

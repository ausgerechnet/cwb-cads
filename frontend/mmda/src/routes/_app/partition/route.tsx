import { createFileRoute } from '@tanstack/react-router'
import { corpusList, subcorporaList } from '@cads/shared/queries'

export const Route = createFileRoute('/_app/partition')({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(corpusList),
      queryClient.ensureQueryData(subcorporaList),
    ]),
})

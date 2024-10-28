import { corpusList, subcorporaList } from '@cads/shared/queries'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/keyword-analysis_/new')({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(subcorporaList),
      queryClient.ensureQueryData(corpusList),
    ]),
})

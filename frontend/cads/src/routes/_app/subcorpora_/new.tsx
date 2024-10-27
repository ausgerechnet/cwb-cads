import { createFileRoute } from '@tanstack/react-router'
import { corpusList } from '@cads/shared/queries'

export const Route = createFileRoute('/_app/subcorpora_/new')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(corpusList),
})

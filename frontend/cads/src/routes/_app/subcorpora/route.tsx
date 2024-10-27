import { createFileRoute } from '@tanstack/react-router'
import { subcorporaList } from '@cads/shared/queries'

export const Route = createFileRoute('/_app/subcorpora')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(subcorporaList),
})

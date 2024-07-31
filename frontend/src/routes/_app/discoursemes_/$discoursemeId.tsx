import { createFileRoute } from '@tanstack/react-router'
import { discoursemeById } from '@/lib/queries'

export const Route = createFileRoute('/_app/discoursemes/$discoursemeId')({
  loader: ({ context: { queryClient }, params: { discoursemeId } }) =>
    queryClient.ensureQueryData(discoursemeById(discoursemeId)),
})

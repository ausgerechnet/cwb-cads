import { createFileRoute } from '@tanstack/react-router'
import { discoursemeQueryOptions } from '@/lib/queries'

export const Route = createFileRoute('/_app/discoursemes/$discoursemeId')({
  loader: async ({ context: { queryClient }, params: { discoursemeId } }) => ({
    query: await queryClient.fetchQuery(discoursemeQueryOptions(discoursemeId)),
  }),
})

import { queryQueryOptions } from '@/lib/queries'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/queries/$queryId')({
  loader: async ({ context: { queryClient }, params: { queryId } }) => ({
    query: await queryClient.ensureQueryData(queryQueryOptions(queryId)),
  }),
})

import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { queriesQueryOptions } from '@/lib/queries'

export const Route = createFileRoute('/_app/collocation-analysis/new')({
  validateSearch: z.object({
    queryId: z.string().optional(),
  }),
  loader: async ({ context: { queryClient } }) => ({
    queries: await queryClient.ensureQueryData(queriesQueryOptions),
  }),
})

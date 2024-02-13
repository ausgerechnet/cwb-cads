import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { discoursemesQueryOptions, queriesQueryOptions } from '@/lib/queries'

export const Route = createFileRoute('/_app/collocation-analysis/new')({
  validateSearch: z.object({
    queryId: z.coerce.number().int().nonnegative().optional().catch(undefined),
  }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(queriesQueryOptions),
      queryClient.ensureQueryData(discoursemesQueryOptions),
    ]),
})

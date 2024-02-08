import { createFileRoute, defer } from '@tanstack/react-router'
import { DefaultPendingComponent } from '@/components/default-pending-component'
import {
  queryBreakdownsQueryOptions,
  queryConcordancesQueryOptions,
  queryQueryOptions,
} from '@/lib/queries'
import { z } from 'zod'

export const Route = createFileRoute('/_app/queries/$queryId')({
  validateSearch: z.object({
    pAtt: z.string().optional(),
  }),
  loader: async ({ context: { queryClient }, params: { queryId } }) => ({
    query: await queryClient.ensureQueryData(queryQueryOptions(queryId)),
    concordances: defer(
      queryClient.ensureQueryData(queryConcordancesQueryOptions(queryId)),
    ),
    breakdown: await queryClient.ensureQueryData(
      queryBreakdownsQueryOptions(queryId),
    ),
  }),
  pendingComponent: DefaultPendingComponent,
})

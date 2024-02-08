import { createFileRoute } from '@tanstack/react-router'
import { DefaultPendingComponent } from '@/components/default-pending-component'
import {
  queryBreakdownsQueryOptions,
  queryConcordancesQueryOptions,
  queryQueryOptions,
} from '@/lib/queries'

export const Route = createFileRoute('/_app/queries/$queryId')({
  loader: async ({ context: { queryClient }, params: { queryId } }) => ({
    query: await queryClient.ensureQueryData(queryQueryOptions(queryId)),
    concordances: await queryClient.ensureQueryData(
      queryConcordancesQueryOptions(queryId),
    ),
    breakdown: await queryClient.ensureQueryData(
      queryBreakdownsQueryOptions(queryId),
    ),
  }),
  pendingComponent: DefaultPendingComponent,
})

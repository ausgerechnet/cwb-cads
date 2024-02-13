import { createFileRoute } from '@tanstack/react-router'
import { DefaultPendingComponent } from '@/components/default-pending-component'
import {
  discoursemesQueryOptions,
  queryBreakdownsQueryOptions,
  queryQueryOptions,
} from '@/lib/queries'
import { z } from 'zod'

export const Route = createFileRoute('/_app/queries/$queryId')({
  validateSearch: z.object({
    pAtt: z.string().optional(),
  }),
  loader: ({ context: { queryClient }, params: { queryId } }) =>
    Promise.all([
      queryClient.ensureQueryData(queryQueryOptions(queryId)),
      queryClient.ensureQueryData(queryBreakdownsQueryOptions(queryId)),
      queryClient.ensureQueryData(discoursemesQueryOptions),
    ]),
  pendingComponent: DefaultPendingComponent,
})

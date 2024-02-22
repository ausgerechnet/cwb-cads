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
    contextBreak: z.string().optional().catch(undefined),
    windowSize: z.number().positive().min(2).int().optional().catch(undefined),
    primary: z.string().optional(),
    secondary: z.string().optional(),
    clSortBy: z.number().int().optional(),
    clSortOrder: z.number().int().optional(),
    clPageSize: z.number().positive().int().optional().catch(undefined),
    clPageIndex: z.number().nonnegative().int().optional().catch(undefined),
    filterItem: z.string().optional().catch(undefined),
  }),
  loader: ({ context: { queryClient }, params: { queryId } }) =>
    Promise.all([
      queryClient.ensureQueryData(queryQueryOptions(queryId)),
      queryClient.ensureQueryData(queryBreakdownsQueryOptions(queryId)),
      queryClient.ensureQueryData(discoursemesQueryOptions),
    ]),
  pendingComponent: DefaultPendingComponent,
})

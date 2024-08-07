import { createFileRoute } from '@tanstack/react-router'
import { DefaultPendingComponent } from '@/components/default-pending-component'
import {
  discoursemesList,
  // queryBreakdownsQueryOptions,
  queryById,
} from '@/lib/queries'
import { z } from 'zod'

export const Route = createFileRoute('/_app/queries/$queryId')({
  validateSearch: z.object({
    pAtt: z.string().optional(),
    contextBreak: z.string().optional().catch(undefined),
    windowSize: z.number().positive().min(2).int().optional().catch(undefined),
    primary: z.string().optional(),
    secondary: z.string().optional().catch(undefined),
    clSortOrder: z
      .enum(['ascending', 'descending', 'random'] as const)
      .optional()
      .catch(undefined),
    clSortByOffset: z.number().int().optional().catch(undefined),
    clPageSize: z.number().positive().int().optional().catch(undefined),
    clPageIndex: z.number().nonnegative().int().optional().catch(undefined),
    filterItem: z.string().optional().catch(undefined),
    filterItemPAtt: z.string().optional().catch(undefined),
    isConcordanceVisible: z.boolean().optional().catch(true),
  }),
  loader: ({ context: { queryClient }, params: { queryId } }) =>
    Promise.all([
      queryClient.ensureQueryData(queryById(parseInt(queryId))),
      // queryClient.ensureQueryData(queryBreakdownsQueryOptions(queryId)),
      queryClient.ensureQueryData(discoursemesList),
    ]),
  pendingComponent: DefaultPendingComponent,
})

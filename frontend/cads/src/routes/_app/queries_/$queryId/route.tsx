import { createFileRoute } from '@tanstack/react-router'
import { DefaultPendingComponent } from '@/components/default-pending-component'
import {
  corpusById,
  discoursemesList,
  // queryBreakdownsQueryOptions,
  queryById,
} from '@cads/shared/queries'
import { z } from 'zod'

export const Route = createFileRoute('/_app/queries_/$queryId')({
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
  loader: async ({ context: { queryClient }, params: { queryId } }) => {
    const [query] = await Promise.all([
      queryClient.ensureQueryData(queryById(parseInt(queryId))),
      // queryClient.ensureQueryData(queryBreakdownsQueryOptions(queryId)),
      queryClient.ensureQueryData(discoursemesList),
    ])
    await queryClient.ensureQueryData(corpusById(query.corpus_id!))
  },
  pendingComponent: DefaultPendingComponent,
})

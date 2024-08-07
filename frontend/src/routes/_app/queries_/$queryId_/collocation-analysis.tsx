import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { DefaultPendingComponent } from '@/components/default-pending-component'
import { queryById } from '@/lib/queries'

export const Route = createFileRoute(
  '/_app/queries/$queryId/collocation-analysis',
)({
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
  }),
  loader: ({ context: { queryClient }, params: { queryId } }) =>
    queryClient.ensureQueryData(queryById(parseInt(queryId))),
  pendingComponent: DefaultPendingComponent,
  component: CollocationAnalysis,
})

function CollocationAnalysis() {
  const { queryId } = Route.useParams()
  return <>{queryId}</>
}

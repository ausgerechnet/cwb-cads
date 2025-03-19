import { createFileRoute } from '@tanstack/react-router'
import { DefaultPendingComponent } from '@/components/default-pending-component'
import {
  corpusById,
  discoursemesList,
  // queryBreakdownsQueryOptions,
  queryById,
} from '@cads/shared/queries'
import { z } from 'zod'
import { FilterSchema } from '../../constellations_/$constellationId/-use-filter-selection'

export const Route = createFileRoute('/_app/queries_/$queryId')({
  validateSearch: FilterSchema.extend({
    contextBreak: z.string().optional().catch(undefined),
    clSortOrder: z
      .enum(['ascending', 'descending', 'random', 'first'] as const)
      .optional()
      .catch(undefined),
    // TODO: This is mostly a duplicate. Prefix filterItem and filterItemPAtt with cl
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

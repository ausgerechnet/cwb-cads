import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { FilterSchema } from '../../constellations_/$constellationId/-use-filter-selection'

export const Route = createFileRoute('/_app/queries_/$queryId/semantic-map')({
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
})

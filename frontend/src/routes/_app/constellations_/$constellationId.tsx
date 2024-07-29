import { constellationQueryOptions, corporaQueryOptions } from '@/lib/queries'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

export const Route = createFileRoute('/_app/constellations/$constellationId')({
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
    corpusId: z.number().optional(),
  }),
  loader: ({ context: { queryClient }, params: { constellationId } }) =>
    Promise.all([
      queryClient.ensureQueryData(constellationQueryOptions(constellationId)),
      queryClient.ensureQueryData(corporaQueryOptions),
    ]),
})

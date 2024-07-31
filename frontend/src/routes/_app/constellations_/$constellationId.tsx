import { constellationById, corpusList } from '@/lib/queries'
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
    ccPageSize: z.number().positive().int().optional().catch(undefined),
    ccPageNumber: z.number().nonnegative().int().optional().catch(undefined),
    ccSortOrder: z
      .enum(['ascending', 'descending'] as const)
      .optional()
      .catch(undefined),
    ccSortBy: z
      .enum([
        'conservative_log_ratio',
        'O11',
        'E11',
        'ipm',
        'log_likelihood',
        'z_score',
        't_score',
        'simple_ll',
        'dice',
        'log_ratio',
        'min_sensitivity',
        'liddell',
        'mutual_information',
        'local_mutual_information',
      ] as const)
      .optional()
      .catch(undefined),
    p: z.string().optional().catch(undefined),
    semanticBreak: z.string().optional().catch(undefined),
    semanticMapId: z.number().optional().catch(undefined),
    filterItem: z.string().optional().catch(undefined),
    filterItemPAtt: z.string().optional().catch(undefined),
    corpusId: z.number().optional().catch(undefined),
    subcorpusId: z.number().optional().catch(undefined),
    isConcordanceVisible: z.boolean().optional().catch(true),
  }),
  loader: ({ context: { queryClient }, params: { constellationId } }) =>
    Promise.all([
      queryClient.ensureQueryData(constellationById(constellationId)),
      queryClient.ensureQueryData(corpusList),
    ]),
})

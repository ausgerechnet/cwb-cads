import { createFileRoute } from '@tanstack/react-router'
import { DefaultPendingComponent } from '@/components/default-pending-component'
import { corpusById, discoursemesList, queryById } from '@cads/shared/queries'
import { z } from 'zod'
import { ConcordanceFilterSchema } from '@cads/shared/components/concordances'

export const Route = createFileRoute('/_app/queries_/$queryId')({
  validateSearch: ConcordanceFilterSchema.extend({
    contextBreak: z.string().optional().catch(undefined),
    clSortOrder: z
      .enum(['ascending', 'descending', 'random', 'first'] as const)
      .optional()
      .catch(undefined),

    pAtt: z.string().optional().catch(undefined), // for frequency breakdown
    // TODO: This is mostly a duplicate. Prefix filterItem and filterItemPAtt with cl
    filterItem: z.string().optional().catch(undefined),
    filterItemPAtt: z.string().optional().catch(undefined),
    isConcordanceVisible: z.boolean().optional().catch(true),

    // ---
    corpusId: z.number().optional().catch(undefined), // not necessary here
    subcorpusId: z.number().optional().catch(undefined),
    focusDiscourseme: z.number().optional().catch(undefined),
    ccPageNumber: z.number().nonnegative().int().optional().catch(undefined),
    ccFilterDiscoursemeIds: z.number().int().array().optional().catch([]),
    ccPageSize: z.number().positive().int().optional().catch(undefined),
    s: z.string().optional().catch(undefined),
    ccSortOrder: z
      .enum(['ascending', 'descending'] as const)
      .optional()
      .catch('descending'),
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
  }),
  loader: async ({ context: { queryClient }, params: { queryId } }) => {
    const [query] = await Promise.all([
      queryClient.ensureQueryData(queryById(parseInt(queryId))),
      queryClient.ensureQueryData(discoursemesList),
    ])
    await queryClient.ensureQueryData(corpusById(query.corpus_id!))
  },
  pendingComponent: DefaultPendingComponent,
})

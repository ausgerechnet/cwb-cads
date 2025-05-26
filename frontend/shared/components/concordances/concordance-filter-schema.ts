import { z } from 'zod'

export const ConcordanceFilterSchema = z.object({
  windowSize: z.number().positive().min(2).int().optional().catch(undefined),
  primary: z.string().optional().catch(undefined),
  secondary: z.string().optional().catch(undefined),
  clContextBreak: z.string().optional().catch(undefined),
  clFilterDiscoursemeIds: z.number().int().array().optional().catch([]),
  clFocusDiscoursemeId: z.number().int().optional().catch(undefined),
  clSortOrder: z
    .enum(['ascending', 'descending', 'random', 'first'] as const)
    .optional()
    .catch(undefined),
  clSortByOffset: z.number().int().optional().catch(undefined),
  clPageSize: z.number().positive().int().optional().catch(undefined),
  clPageIndex: z.number().nonnegative().int().optional().catch(undefined),
  clFilterItem: z.string().optional().catch(undefined),
  clFilterItemPAtt: z.string().optional().catch(undefined),
})

export type ConcordanceFilterSchema = z.infer<typeof ConcordanceFilterSchema>

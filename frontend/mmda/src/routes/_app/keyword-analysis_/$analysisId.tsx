import { keywordAnalysisById } from '@cads/shared/queries'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { FilterSchema } from '../constellations_/$constellationId/-use-filter-selection'

export const Route = createFileRoute('/_app/keyword-analysis_/$analysisId')({
  validateSearch: FilterSchema.extend({
    clIsVisible: z.boolean().optional().catch(true),
    clCorpus: z.enum(['target', 'reference']).optional().catch('target'),
    clSortOrder: z
      .enum(['ascending', 'descending', 'random'])
      .optional()
      .catch('random'),
    clContextBreak: z.string().optional(),
    contextBreak: z.string().optional(),
  }),
  loader: ({ context: { queryClient }, params }) => {
    const analysisId = parseInt(params.analysisId)
    return queryClient.ensureQueryData(keywordAnalysisById(analysisId))
  },
})

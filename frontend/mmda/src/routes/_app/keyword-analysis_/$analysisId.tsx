import { keywordAnalysisById } from '@cads/shared/queries'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { FilterSchema } from '../constellations_/$constellationId/-use-filter-selection'

export const Route = createFileRoute('/_app/keyword-analysis_/$analysisId')({
  validateSearch: FilterSchema.extend({
    clIsVisible: z.boolean().optional().catch(true),
  }),
  loader: ({ context: { queryClient }, params }) => {
    const analysisId = parseInt(params.analysisId)
    return queryClient.ensureQueryData(keywordAnalysisById(analysisId))
  },
})

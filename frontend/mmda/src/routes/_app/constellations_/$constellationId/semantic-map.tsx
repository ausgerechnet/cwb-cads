import { createFileRoute } from '@tanstack/react-router'
import { FilterSchema } from '@/routes/_app/constellations_/$constellationId/-use-filter-selection.ts'
import { ConcordanceFilterSchema } from '@cads/shared/components/concordances'
import { AnalysisSchema } from './-use-analysis-selection'

export const Route = createFileRoute(
  '/_app/constellations_/$constellationId/semantic-map',
)({
  validateSearch: FilterSchema.extend({
    ...AnalysisSchema.shape,
    ...ConcordanceFilterSchema.shape,
  }),
})

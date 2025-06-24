import { createFileRoute } from '@tanstack/react-router'
import { UfaAnalysisSchema } from './-use-ufa-selection'

export const Route = createFileRoute(
  '/_app/constellations_/$constellationId/ufa',
)({
  validateSearch: UfaAnalysisSchema,
})

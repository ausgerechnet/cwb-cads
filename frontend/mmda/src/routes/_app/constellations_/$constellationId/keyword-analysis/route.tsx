import { createFileRoute } from '@tanstack/react-router'
import { KeywordAnalysisSchema } from './-use-keyword-selection'

export const Route = createFileRoute(
  '/_app/constellations_/$constellationId/keyword-analysis',
)({
  validateSearch: KeywordAnalysisSchema,
})

import { createFileRoute } from '@tanstack/react-router'
import { CollocationSelectionSchema } from './-use-collocation-selection'

export const Route = createFileRoute(
  '/_app/constellations_/$constellationId/collocation-analysis',
)({
  validateSearch: CollocationSelectionSchema,
})

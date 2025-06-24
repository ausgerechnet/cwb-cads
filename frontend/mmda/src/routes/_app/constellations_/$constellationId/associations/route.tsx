import { createFileRoute } from '@tanstack/react-router'
import { AssociationsSchema } from './-use-associations-selection'

export const Route = createFileRoute(
  '/_app/constellations_/$constellationId/associations',
)({
  validateSearch: AssociationsSchema,
})

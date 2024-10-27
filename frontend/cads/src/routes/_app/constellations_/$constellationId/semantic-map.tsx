import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { FilterSchema } from '@/routes/_app/constellations_/$constellationId/-use-filter-selection.ts'

export const Route = createFileRoute(
  '/_app/constellations_/$constellationId/semantic-map',
)({
  validateSearch: FilterSchema.extend({
    focusDiscourseme: z.number().optional().catch(undefined),
  }),
})

import {
  constellationById,
  constellationDescriptionsById,
  corpusList,
} from '@/lib/queries.ts'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { FilterSchema } from '@/routes/_app/constellations_/$constellationId/-use-filter-selection.ts'

export const Route = createFileRoute('/_app/constellations/$constellationId')({
  validateSearch: FilterSchema.extend({
    focusDiscourseme: z.number().optional().catch(undefined),
  }),
  loader: ({ context: { queryClient }, params: { constellationId } }) =>
    Promise.all([
      queryClient.ensureQueryData(constellationById(parseInt(constellationId))),
      queryClient.ensureQueryData(corpusList),
      queryClient.ensureQueryData(
        constellationDescriptionsById(parseInt(constellationId)),
      ),
    ]),
})
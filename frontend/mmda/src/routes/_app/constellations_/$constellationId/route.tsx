import { z } from 'zod'
import {
  constellationById,
  constellationDescriptionsById,
  corpusList,
  discoursemesList,
} from '@cads/shared/queries'
import { createFileRoute } from '@tanstack/react-router'
import { FilterSchema } from '@/routes/_app/constellations_/$constellationId/-use-filter-selection.ts'
import { ConcordanceFilterSchema } from '@cads/shared/components/concordances'
import { AnalysisSchema } from './-use-analysis-selection'

export const Route = createFileRoute('/_app/constellations_/$constellationId')({
  validateSearch: FilterSchema.extend({
    ...AnalysisSchema.shape,
    ...ConcordanceFilterSchema.shape,
    ufaTimeSpan: z.string().optional(),
  }),
  loader: ({ context: { queryClient }, params: { constellationId } }) =>
    Promise.all([
      queryClient.ensureQueryData(discoursemesList),
      queryClient.ensureQueryData(constellationById(parseInt(constellationId))),
      queryClient.ensureQueryData(corpusList),
      queryClient.ensureQueryData(
        constellationDescriptionsById(parseInt(constellationId)),
      ),
    ]),
})

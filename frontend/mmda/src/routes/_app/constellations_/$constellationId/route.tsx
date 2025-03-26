import {
  constellationById,
  constellationDescriptionsById,
  corpusList,
  discoursemesList,
} from '@cads/shared/queries'
import { createFileRoute } from '@tanstack/react-router'
import { FilterSchema } from '@/routes/_app/constellations_/$constellationId/-use-filter-selection.ts'
import { AnalysisSchema } from './-analysis-selection'

export const Route = createFileRoute('/_app/constellations_/$constellationId')({
  validateSearch: FilterSchema.extend({
    ...AnalysisSchema.shape,
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

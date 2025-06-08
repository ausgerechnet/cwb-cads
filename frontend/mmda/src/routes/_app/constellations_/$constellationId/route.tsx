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
// import { AnalysisSchema } from './-use-analysis-selection'

export const Route = createFileRoute('/_app/constellations_/$constellationId')({
  validateSearch: FilterSchema.extend({
    // remove this...
    // ...AnalysisSchema.shape,
    ufaTimeSpan: z.string().optional(),
    // maybe this
    ...ConcordanceFilterSchema.shape,
    analysisLayer: z.string().optional(),
    // ---
    // contextBreak: z.string().optional(),
    // isConcordanceVisible: z.boolean().optional().default(false),
    // corpusId: z.number().optional(),
    // subcorpusId: z.number().optional(),
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

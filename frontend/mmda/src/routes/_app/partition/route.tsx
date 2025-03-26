import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { corpusList, subcorporaList } from '@cads/shared/queries'

export const Route = createFileRoute('/_app/partition')({
  validateSearch: z.object({
    defaultCorpusId: z.number().optional(),
    defaultSubcorpusId: z.number().optional(),
  }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(corpusList),
      queryClient.ensureQueryData(subcorporaList),
    ]),
})

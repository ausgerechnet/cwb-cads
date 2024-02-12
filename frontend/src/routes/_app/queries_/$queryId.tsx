import { createFileRoute, defer } from '@tanstack/react-router'
import { DefaultPendingComponent } from '@/components/default-pending-component'
import {
  discoursemesQueryOptions,
  queryBreakdownsQueryOptions,
  queryConcordancesQueryOptions,
  queryQueryOptions,
} from '@/lib/queries'
import { z } from 'zod'

export const Route = createFileRoute('/_app/queries/$queryId')({
  validateSearch: z.object({
    pAtt: z.string().optional(),
  }),
  loader: async ({ context: { queryClient }, params: { queryId } }) => {
    const [query, breakdown, discoursemes] = await Promise.all([
      queryClient.fetchQuery(queryQueryOptions(queryId)),
      queryClient.ensureQueryData(queryBreakdownsQueryOptions(queryId)),
      queryClient.fetchQuery(discoursemesQueryOptions),
    ])
    const discoursemeId = query.discourseme_id
    const queryDiscourseme = discoursemeId
      ? discoursemes.find((discourseme) => discourseme.id === discoursemeId)
      : undefined
    return {
      query,
      breakdown,
      discoursemes,
      queryDiscourseme,
      concordances: defer(
        queryClient.ensureQueryData(queryConcordancesQueryOptions(queryId)),
      ),
    }
  },
  pendingComponent: DefaultPendingComponent,
})

import { queryOptions, MutationOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient, queryClient, schemas } from '@/rest-client'

// ==================== QUERIES ====================
// "queries" as in "cqp queries", but "query" as in "react-query"
export const queriesQueryOptions = queryOptions({
  queryKey: ['queries'],
  queryFn: ({ signal }) => apiClient.getQuery({ signal }),
  placeholderData: [],
})

export const queryQueryOptions = (queryId: string) =>
  queryOptions({
    queryKey: ['query', queryId],
    queryFn: ({ signal }) =>
      apiClient.getQueryId({ params: { id: queryId }, signal }),
    placeholderData: {},
  })

export const executeQueryMutationOptions: MutationOptions<
  unknown,
  Error,
  string
> = {
  mutationFn: (queryId: string) =>
    apiClient.postQueryIdexecute(undefined, { params: { id: queryId } }),
  onSuccess: () => queryClient.invalidateQueries(queriesQueryOptions),
}

export const postQueryMutationOptions: MutationOptions<
  z.infer<typeof schemas.QueryOut>,
  Error,
  z.infer<typeof schemas.QueryIn>
> = {
  mutationFn: (body) => apiClient.postQuery(body),
  onSuccess: () => {
    queryClient.invalidateQueries(queriesQueryOptions)
  },
}

export const postQueryAssistedMutationOptions: MutationOptions<
  z.infer<typeof schemas.QueryOut>,
  Error,
  z.infer<typeof schemas.QueryAssistedIn>
> = {
  mutationFn: (body) => apiClient.postQueryassisted(body),
  onSuccess: () => {
    queryClient.invalidateQueries(queriesQueryOptions)
  },
}

export const deleteQueryMutationOptions: MutationOptions<
  unknown,
  Error,
  string
> = {
  mutationFn: (queryId: string) =>
    apiClient.deleteQueryId(undefined, { params: { id: queryId } }),
  onSuccess: () => {
    queryClient.invalidateQueries(queriesQueryOptions)
  },
}

export const queryBreakdownsQueryOptions = (queryId: string) =>
  queryOptions({
    queryKey: ['query-breakdowns', queryId],
    queryFn: ({ signal }) =>
      apiClient.getBreakdownqueryQuery_id({
        params: { query_id: queryId },
        signal,
      }),
  })

export const queryBreakdownForPQueryOptions = (queryId: string, p: string) =>
  queryOptions({
    queryKey: ['query-breakdown', queryId, p],
    queryFn: async () => {
      const allBreakdowns = z
        .array(schemas.BreakdownOut)
        .parse(queryClient.getQueryData(['query-breakdowns', queryId]) ?? [])
      const breakdown = allBreakdowns.find((b) => b.p === p)
      if (breakdown) return breakdown
      const newBreakdown = await apiClient.postBreakdownqueryQuery_id(
        { p },
        { params: { query_id: queryId } },
      )
      allBreakdowns.push(newBreakdown)
      queryClient.setQueryData(['query-breakdowns', queryId], allBreakdowns)
      return newBreakdown
    },
  })

export const queryConcordancesQueryOptions = (queryId: string) =>
  queryOptions({
    queryKey: ['query-concordances', queryId],
    queryFn: ({ signal }) =>
      apiClient.getQueryQuery_idconcordance({
        params: { query_id: queryId },
        signal,
      }),
  })

// ==================== CORPORA ====================

export const corporaQueryOptions = queryOptions({
  queryKey: ['corpora'],
  queryFn: ({ signal }) => apiClient.getCorpus({ signal }),
})

export const subcorporaQueryOptions = (corpusId: string) =>
  queryOptions({
    queryKey: ['subcorpora', corpusId],
    queryFn: ({ signal }) =>
      apiClient.getCorpusIdsubcorpora({ params: { id: corpusId }, signal }),
  })

export const putSubcorpusMutationOptions: MutationOptions<
  unknown,
  Error,
  string
> = {
  mutationFn: async (id: string) =>
    apiClient.putCorpusIdsubcorpus(undefined, { params: { id } }),
  onSuccess: () => {
    queryClient.invalidateQueries(corporaQueryOptions)
  },
}

// ==================== USERS ====================

export const sessionQueryOptions = queryOptions({
  queryKey: ['session'],
  queryFn: ({ signal }) => apiClient.getUseridentify({ signal }),
  retry: false,
})

export const loginMutationOptions: MutationOptions<
  z.infer<typeof schemas.TokenOut>,
  Error,
  z.infer<typeof schemas.UserIn>
> = {
  mutationFn: (credentials) => apiClient.postUserlogin(credentials),
  onSuccess: ({ access_token }) => {
    if (access_token) {
      localStorage.setItem('auth-token', access_token)
    }
    queryClient.invalidateQueries(sessionQueryOptions)
  },
}

export const getUsersQueryOptions = queryOptions({
  queryKey: ['all-users'],
  queryFn: ({ signal }) => apiClient.getUser({ signal }),
})

export const logoutMutationOptions: MutationOptions = {
  mutationFn: async () => {
    localStorage.removeItem('auth-token')
  },
  onSuccess: () => {
    void queryClient.invalidateQueries(sessionQueryOptions)
  },
}

// ==================== DISCOURSEMES ====================

export const discoursemesQueryOptions = queryOptions({
  queryKey: ['discoursemes'],
  queryFn: ({ signal }) => apiClient.getDiscourseme({ signal }),
})

export const discoursemeQueryOptions = (discoursemeId: string) =>
  queryOptions({
    queryKey: ['discourseme', discoursemeId],
    queryFn: ({ signal }) =>
      apiClient.getDiscoursemeId({ params: { id: discoursemeId }, signal }),
  })

export const postDiscoursemeMutationOptions: MutationOptions<
  z.infer<typeof schemas.DiscoursemeOut>,
  Error,
  z.infer<typeof schemas.DiscoursemeIn>
> = {
  mutationFn: (body) => apiClient.postDiscourseme(body),
  onSuccess: () => {
    queryClient.invalidateQueries(discoursemesQueryOptions)
  },
}

// ==================== COLLOCATIONS ====================

export const collocationsQueryOptions = queryOptions({
  queryKey: ['collocations'],
  queryFn: ({ signal }) => apiClient.getCollocation({ signal }),
})

export const postCollocationQueryMutationOptions: MutationOptions<
  unknown,
  Error,
  z.infer<typeof schemas.CollocationIn>
> = {
  mutationFn: (collocationIn) =>
    apiClient.postCollocationqueryQuery_id(collocationIn, {
      params: { query_id: collocationIn.query_id?.toString() ?? '' },
    }),
}

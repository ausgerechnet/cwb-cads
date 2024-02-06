import { apiClient, queryClient, schemas } from '@/rest-client'
import { queryOptions, MutationOptions } from '@tanstack/react-query'
import { z } from 'zod'

// ==================== QUERIES ====================
// "queries" as in "cqp queries", but "query" as in "react-query"
export const queriesQueryOptions = queryOptions({
  queryKey: ['queries'],
  queryFn: () => apiClient.getQuery(),
})

export const queryQueryOptions = (queryId: string) =>
  queryOptions({
    queryKey: ['query', queryId],
    queryFn: () => apiClient.getQueryId({ params: { id: queryId } }),
  })

export const sessionQueryOptions = queryOptions({
  queryKey: ['session'],
  queryFn: () => apiClient.getUseridentify(),
  refetchInterval: 60_000,
  retry: false,
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
    console.log('invalidating queries')
    queryClient.invalidateQueries(queriesQueryOptions)
  },
}

export const postQueryAssistedMutationOptions: MutationOptions<
  unknown,
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

// ==================== CORPORA ====================

export const corporaQueryOptions = queryOptions({
  queryKey: ['corpora'],
  queryFn: () => apiClient.getCorpus(),
})

export const subcorporaQueryOptions = (corpusId: string) =>
  queryOptions({
    queryKey: ['subcorpora', corpusId],
    queryFn: () =>
      apiClient.getCorpusIdsubcorpora({ params: { id: corpusId } }),
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
  queryFn: () => apiClient.getUser(),
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
  queryFn: () => apiClient.getDiscourseme(),
})

export const discoursemeQueryOptions = (discoursemeId: string) =>
  queryOptions({
    queryKey: ['discourseme', discoursemeId],
    queryFn: () =>
      apiClient.getDiscoursemeId({ params: { id: discoursemeId } }),
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
  queryFn: () => apiClient.getCollocation(),
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

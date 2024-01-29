import { apiClient, queryClient, schemas } from '@/rest-client'
import { queryOptions, MutationOptions } from '@tanstack/react-query'
import { z } from 'zod'

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
  queryFn: () => apiClient.getUsersession(),
  refetchInterval: 60_000,
  retry: false,
})

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

export const logoutMutationOptions: MutationOptions = {
  mutationFn: () => apiClient.postUserlogout(undefined),
  onSuccess: () => {
    void queryClient.invalidateQueries(sessionQueryOptions)
  },
}

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
  unknown,
  Error,
  z.infer<typeof schemas.QueryAssistedIn>
> = {
  mutationFn: (body) => apiClient.postQueryassisted(body),
  onSuccess: () => {
    queryClient.invalidateQueries(queriesQueryOptions)
  },
}

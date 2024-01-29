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

export const discoursemesQueryOptions = queryOptions({
  queryKey: ['discoursemes'],
  queryFn: () => apiClient.getDiscourseme(),
})

export const logoutMutationOptions: MutationOptions = {
  mutationFn: () => apiClient.postUserlogout(undefined),
  onSuccess: () => {
    void queryClient.invalidateQueries(sessionQueryOptions)
  },
}

export const postQueryMutationOptions: MutationOptions<
  unknown,
  Error,
  z.infer<typeof schemas.QueryIn>
> = {
  mutationFn: (body: z.infer<typeof schemas.QueryIn>) =>
    apiClient.postQuery(body),
  onSuccess: () => {
    queryClient.invalidateQueries(queriesQueryOptions)
  },
}

export const postQueryAssistedMutationOptions: MutationOptions<
  unknown,
  Error,
  z.infer<typeof schemas.QueryAssistedIn>
> = {
  mutationFn: (body: z.infer<typeof schemas.QueryAssistedIn>) =>
    apiClient.postQueryassisted(body),
  onSuccess: () => {
    queryClient.invalidateQueries(queriesQueryOptions)
  },
}

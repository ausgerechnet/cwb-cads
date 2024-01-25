import { apiClient, queryClient } from '@/rest-client'
import { queryOptions, MutationOptions } from '@tanstack/react-query'

// "queries" as in "cqp queries", but "query" as in "react-query"
export const queriesQueryOptions = queryOptions({
  queryKey: ['queries'],
  queryFn: () => apiClient.getQuery(),
})

export const sessionQueryOptions = queryOptions({
  queryKey: ['session'],
  queryFn: () => apiClient.getUsersession(),
  refetchInterval: 60_000,
  retry: false,
})

export const logoutMutationOptions: MutationOptions = {
  mutationFn: () => apiClient.postUserlogout(undefined),
  onSuccess: () => {
    queryClient.invalidateQueries(sessionQueryOptions)
  },
}

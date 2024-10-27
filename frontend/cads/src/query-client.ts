import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1_000 * 60 * 60, // 60 minutes
      gcTime: 1_000 * 60 * 60,
    },
  },
})

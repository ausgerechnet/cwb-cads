import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1_000 * 60,
      refetchOnWindowFocus: false,
      gcTime: 1_000 * 60 * 10, // 10 minutes
    },
  },
})

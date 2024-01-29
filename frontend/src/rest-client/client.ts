import { QueryClient } from '@tanstack/react-query'

import { createApiClient } from './__generated__client'
import { sessionQueryOptions } from '@/lib/queries'
import { router } from '@/router'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnWindowFocus: false,
    },
  },
})

export const apiClient = createApiClient(import.meta.env.VITE_API_URL || '/api')

apiClient.axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Redirect to login page if the user is not authenticated for anything
    // The redirect search param is used to redirect back to the original page
    const status = error?.response?.status
    if (status === 401) {
      queryClient.invalidateQueries(sessionQueryOptions)
      const { pathname, search } = location
      router.navigate({
        to: '/login',
        search:
          pathname === '/login'
            ? {}
            : {
                redirect: pathname + search,
              },
      })
    }
    return Promise.reject(error)
  },
)

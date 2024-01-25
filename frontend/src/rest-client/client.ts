import { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'

import { createApiClient } from './__generated__client'
import { sessionQueryOptions } from '@/data/queries'

export const queryClient = new QueryClient()

export const apiClient = createApiClient(
  import.meta.env.VITE_API_URL || ':3000',
)

apiClient.axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Observe all errors and redirect to login page if the user is not authenticated
    // Unless the request was to the login endpoint
    const status = error?.response?.status
    if (status === 401) {
      queryClient.invalidateQueries(sessionQueryOptions)
      redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
    return Promise.reject(error)
  },
)

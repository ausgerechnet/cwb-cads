import { QueryClient } from '@tanstack/react-query'

import { createApiClient } from './__generated__client'
import { router } from '@/router'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: true,
    },
  },
})

export const apiClient = createApiClient(import.meta.env.VITE_API_URL || '/api')

apiClient.axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-token')
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

apiClient.axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If the API returns a 401 or 403, it means the token is invalid or expired
    // Re-routing the user in such a case is handled by the router, so we can just
    // invalidate the route and let it take care of the rest
    // See: src/routes/_app.tsx
    const status = error?.response?.status
    if (status === 401 || status === 403) {
      await updateAuthToken()
      router.invalidate()
    }
    return Promise.reject(error)
  },
)

async function updateAuthToken() {
  const refreshToken = localStorage.getItem('refresh-token')
  if (!refreshToken) return false
  try {
    const response = await apiClient.postUserrefresh(undefined, {
      headers: { Authorization: `Bearer ${refreshToken}` },
    })
    localStorage.setIten('auth-token', response.access_token)
    localStorage.setIten('refresh-token', response.refresh_token)
    return true
  } catch (e) {
    localStorage.removeItem('auth-token')
    localStorage.removeItem('refresh-token')
    return false
  }
}

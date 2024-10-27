import { get, set, del } from 'idb-keyval'
import {
  PersistedClient,
  Persister,
} from '@tanstack/react-query-persist-client'
import { router } from '@/lib/router'

import { createApiClient } from '@cads/shared/api-client/__generated__client'

export function createIDBPersister(idbValidKey: IDBValidKey = 'reactQuery') {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(idbValidKey, client)
    },
    restoreClient: async () => {
      return await get<PersistedClient>(idbValidKey)
    },
    removeClient: async () => {
      await del(idbValidKey)
    },
  } satisfies Persister
}

export const apiClient = createApiClient(import.meta.env.VITE_API_URL || '/api')

apiClient.axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('access-token')
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
      console.warn('Token expired or invalid, trying to refresh')
      await updateAuthToken()
      router.invalidate()
    }
    return Promise.reject(error)
  },
)

async function updateAuthToken() {
  const refreshToken = localStorage.getItem('refresh-token')
  if (!refreshToken) {
    console.warn('No refresh token found')
    return false
  }
  // Remove tokens here already to avoid infinite loop
  localStorage.removeItem('access-token')
  localStorage.removeItem('refresh-token')
  try {
    const { access_token, refresh_token } = await apiClient.postUserrefresh({
      refresh_token: refreshToken,
    })
    console.warn('Token refreshed')
    access_token && localStorage.setItem('access-token', access_token)
    refresh_token && localStorage.setItem('refresh-token', refresh_token)
    return true
  } catch (e) {
    console.warn('Failed to refresh token')
    console.error(e)
    return false
  }
}

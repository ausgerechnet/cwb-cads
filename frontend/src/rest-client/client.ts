import { QueryClient } from '@tanstack/react-query'
import { createApiClient } from './__generated__client'

export const apiClient = createApiClient(
  import.meta.env.VITE_API_URL || ':3000',
)
export const queryClient = new QueryClient()

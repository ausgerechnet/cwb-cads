import { createApiClient } from './__generated__client'

export const apiClient = createApiClient(
  // es-lint-disable-next-line
  // @ts-ignore
  import.meta.env.VITE_API_URL || '/api',
)

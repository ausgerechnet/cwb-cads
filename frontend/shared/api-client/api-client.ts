import { createApiClient } from './__generated__client'
import qs from 'qs'

export const apiClient = createApiClient(
  // es-lint-disable-next-line
  // @ts-ignore
  import.meta.env.VITE_API_URL || '/api',
  {
    axiosConfig: {
      paramsSerializer: (params) => {
        return qs.stringify(params, { arrayFormat: 'repeat' })
    },
  },
)

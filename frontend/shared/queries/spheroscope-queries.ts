import { queryOptions, MutationOptions } from '@tanstack/react-query'
import z from 'zod'
import { queryClient } from './query-client'
import { apiClient, schemas } from '../api-client'

export const spheroscopeSlotQuery = queryOptions({
  queryKey: ['spheroscope-slot-query'],
  queryFn: ({ signal }) => apiClient.getSpheroscopeslotQuery({ signal }),
})

export const createSpheroscopeSlotQuery: MutationOptions<
  z.infer<typeof schemas.SlotQueryOut>,
  Error,
  z.infer<typeof schemas.SlotQueryIn>
> = {
  mutationFn: (body) => apiClient.postSpheroscopeslotQuerycreate(body),
  onSuccess: () => {
    void queryClient.invalidateQueries(spheroscopeSlotQuery)
  },
}

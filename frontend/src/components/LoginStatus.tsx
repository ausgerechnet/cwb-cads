import { apiClient } from '@/rest-client'
import { useQuery } from '@tanstack/react-query'

export function LoginStatus() {
  const { data, isLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      return 'test'
    },
  })

  if (isLoading) {
    return <div>...</div>
  }
  console.log(data)

  return <div>Loginstatus</div>
}

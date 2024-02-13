import { createFileRoute } from '@tanstack/react-router'
import { discoursemesQueryOptions } from '@/lib/queries'

export const Route = createFileRoute('/_app/discoursemes')({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(discoursemesQueryOptions)
  },
})

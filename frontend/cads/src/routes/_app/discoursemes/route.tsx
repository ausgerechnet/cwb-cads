import { createFileRoute } from '@tanstack/react-router'
import { discoursemesList } from '@/queries/queries'

export const Route = createFileRoute('/_app/discoursemes')({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(discoursemesList)
  },
})

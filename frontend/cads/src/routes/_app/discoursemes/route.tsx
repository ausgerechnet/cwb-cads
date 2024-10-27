import { createFileRoute } from '@tanstack/react-router'
import { discoursemesList } from '@cads/shared/queries'

export const Route = createFileRoute('/_app/discoursemes')({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(discoursemesList)
  },
})

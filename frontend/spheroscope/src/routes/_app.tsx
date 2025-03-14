import { userIdentify } from '@cads/shared/queries'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context: { queryClient } }) => {
    try {
      await queryClient.fetchQuery(userIdentify)
    } catch (error) {
      const { pathname, search } = location
      throw redirect({ to: '/login', search: { redirect: pathname + search } })
    }
  },
})

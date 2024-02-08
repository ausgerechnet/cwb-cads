import { sessionQueryOptions } from '@/lib/queries'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context: { queryClient } }) => {
    try {
      await queryClient.fetchQuery(sessionQueryOptions)
    } catch (error) {
      const { pathname, search } = location
      throw redirect({ to: '/login', search: { redirect: pathname + search } })
    }
  },
})

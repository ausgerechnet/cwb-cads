import { Router } from '@tanstack/react-router'
import { apiClient, queryClient } from '@/rest-client/client'
import { routeTree } from './routeTree.gen'

export const router = new Router({
  routeTree,
  defaultStaleTime: 0,
  defaultPreload: 'intent',
  context: {
    queryClient,
    apiClient,
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

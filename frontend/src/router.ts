import { createRouter } from '@tanstack/react-router'
import { queryClient } from '@/rest-client/client'
import { DefaultErrorComponent } from '@/components/default-error-component'
import { routeTree } from './routeTree.gen'

export const router = createRouter({
  routeTree,
  defaultStaleTime: 0,
  defaultPreloadStaleTime: 3_000,
  defaultPreload: 'intent',
  defaultErrorComponent: DefaultErrorComponent,
  context: { queryClient },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

import { createRouter } from '@tanstack/react-router'
import { queryClient } from '@/rest-client/client'
import { DefaultErrorComponent } from '@/components/default-error-component'
import { DefaultPendingComponent } from '@/components/default-pending-component'
import { routeTree } from './routeTree.gen'

export const router = createRouter({
  routeTree,
  defaultStaleTime: 0,
  defaultPreload: false,
  defaultPreloadStaleTime: 0,
  defaultErrorComponent: DefaultErrorComponent,
  defaultPendingComponent: DefaultPendingComponent,
  context: { queryClient },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

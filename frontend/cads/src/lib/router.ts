import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'

import { DefaultErrorComponent } from '@/components/default-error-component'
import { DefaultPendingComponent } from '@/components/default-pending-component'

import { queryClient } from '@/lib/query-client'

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

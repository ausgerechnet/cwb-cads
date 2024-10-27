import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@cads/cads/src/routeTree.gen'

import { DefaultErrorComponent } from '@cads/cads/src/components/default-error-component'
import { DefaultPendingComponent } from '@cads/cads/src/components/default-pending-component'

import { queryClient } from './query-client'

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

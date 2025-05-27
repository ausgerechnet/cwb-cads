import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'

import { DefaultPendingComponent } from '@/components/default-pending-component'
import { queryClient } from '@cads/shared/queries'
import { ErrorMessage } from '@cads/shared/components/error-message'

const basepath = import.meta.env.VITE_ROUTER_BASEPATH || '/'

export const router = createRouter({
  basepath,
  routeTree,
  defaultStaleTime: 0,
  defaultPreload: false,
  defaultPreloadStaleTime: 0,
  defaultErrorComponent: ErrorMessage,
  defaultPendingComponent: DefaultPendingComponent,
  context: { queryClient },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

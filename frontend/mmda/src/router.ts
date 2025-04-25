import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'

import { DefaultErrorComponent } from '@/components/default-error-component'
import { DefaultPendingComponent } from '@/components/default-pending-component'
import { queryClient } from '@cads/shared/queries'

const basepath = import.meta.env.VITE_ROUTER_BASEPATH || '/'

export const router = createRouter({
  basepath,
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

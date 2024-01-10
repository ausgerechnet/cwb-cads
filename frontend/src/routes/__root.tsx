import { Link, Outlet, rootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export const Route = rootRouteWithContext<{
  queryClient: QueryClient
  apiClient: typeof import('@/rest-client').apiClient
}>()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <h1>MMDA Root</h1>
      <div className="flex gap-3">
        <Link to="/" activeProps={{ className: 'font-bold' }}>
          Home
        </Link>
        <Link to="/example" activeProps={{ className: 'font-bold' }}>
          Example
        </Link>
      </div>
      <hr />
      <Outlet />
      <ReactQueryDevtools buttonPosition="top-right" />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  )
}

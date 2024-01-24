import { Link, Outlet, rootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { LoginStatus } from '@/components/LoginStatus'

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
        <Link to="/vignette" activeProps={{ className: 'font-bold' }}>
          Vignette
        </Link>
        <Link to="/login" activeProps={{ className: 'font-bold' }}>
          Login
        </Link>
        <LoginStatus />
      </div>
      <hr />
      <Outlet />
      <ReactQueryDevtools buttonPosition="top-right" />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  )
}

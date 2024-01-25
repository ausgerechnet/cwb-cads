import { Link, Outlet, rootRouteWithContext } from '@tanstack/react-router'
import { NavigationMenu } from '@radix-ui/react-navigation-menu'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { QueryClient, useQuery } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ModeToggle } from '@/components/mode-toggle'
import {
  NavigationMenuItem,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import { Home } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { sessionQueryOptions } from '@/data/queries'

export const Route = rootRouteWithContext<{
  queryClient: QueryClient
  apiClient: typeof import('@/rest-client').apiClient
}>()({
  component: RootComponent,
})

function RootComponent() {
  const { data, isLoading, error } = useQuery(sessionQueryOptions)

  const isLoggedIn = data && !isLoading && !error

  return (
    <>
      <div className="p-2">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link className={navigationMenuTriggerStyle()} to="/">
                <Home className="mr-2 h-4 w-4" />
                Mixed Methods Discourse Analysis
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem className="flex-grow justify-end">
              <Link className={navigationMenuTriggerStyle()} to="/vignette">
                Vignette
              </Link>
            </NavigationMenuItem>
            {isLoggedIn && (
              <>
                <NavigationMenuItem>
                  <Link to="/queries" className={buttonVariants()}>
                    Analysis
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link to="/logout" className={navigationMenuTriggerStyle()}>
                    Logout
                  </Link>
                </NavigationMenuItem>
              </>
            )}
            {!isLoggedIn && (
              <NavigationMenuItem className="flex flex-grow justify-end">
                <Link to="/login" className={buttonVariants()}>
                  Login
                </Link>
              </NavigationMenuItem>
            )}
            <NavigationMenuItem>
              <ModeToggle />
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
      <hr />
      <Outlet />
      <ReactQueryDevtools buttonPosition="bottom-left" />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  )
}

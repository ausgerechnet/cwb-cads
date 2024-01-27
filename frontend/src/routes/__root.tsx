import { Outlet, rootRouteWithContext } from '@tanstack/react-router'
import { NavigationMenu } from '@radix-ui/react-navigation-menu'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { QueryClient, useQuery } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ModeToggle } from '@/components/mode-toggle'
import { MenuLink } from '@/components/menu-link'
import {
  NavigationMenuItem,
  NavigationMenuList,
} from '@/components/ui/navigation-menu'
import { Home } from 'lucide-react'
import { sessionQueryOptions } from '@/lib/queries'

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
      <div className="border-1 sticky top-0 z-10 border-b bg-background p-2">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <MenuLink to="/" activeOptions={{ exact: true }}>
                <Home className="mr-2 h-4 w-4" />
                Mixed Methods Discourse Analysis
              </MenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem className="flex-grow justify-end">
              <MenuLink to="/vignette">Vignette</MenuLink>
            </NavigationMenuItem>
            {isLoggedIn && (
              <>
                <NavigationMenuItem>
                  <MenuLink to="/queries" highlight>
                    Analysis
                  </MenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <MenuLink to="/logout">Logout</MenuLink>
                </NavigationMenuItem>
              </>
            )}
            {!isLoggedIn && (
              <NavigationMenuItem className="flex flex-grow justify-end">
                <MenuLink to="/login">Login</MenuLink>
              </NavigationMenuItem>
            )}
            <NavigationMenuItem>
              <ModeToggle />
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
      <Outlet />
      <ReactQueryDevtools buttonPosition="bottom-left" />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  )
}

import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { NavigationMenu } from '@radix-ui/react-navigation-menu'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { QueryClient, useQuery } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Home } from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'
import { MenuLink } from '@/components/menu-link'
import {
  NavigationMenuItem,
  NavigationMenuList,
} from '@/components/ui/navigation-menu'
import { sessionQueryOptions } from '@/lib/queries'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
})

function RootComponent() {
  const { data, isLoading, error } = useQuery(sessionQueryOptions)

  const isLoggedIn = data && !isLoading && !error

  return (
    <>
      <header className="sticky top-0 z-10 box-border bg-background p-2 ring-1 ring-muted">
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
      </header>
      <Outlet />
      <ReactQueryDevtools buttonPosition="bottom-left" />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  )
}

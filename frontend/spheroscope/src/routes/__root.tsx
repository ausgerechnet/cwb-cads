import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { NavigationMenu } from '@radix-ui/react-navigation-menu'
import { QueryClient, useQuery } from '@tanstack/react-query'
import { Home, User, ScrollText } from 'lucide-react'

import { userIdentify } from '@cads/shared/queries'
import { ModeToggle } from '@cads/shared/components/mode-toggle'
import { MenuLink } from '@/components/menu-link'
import { DevTools } from '@/components/dev-tools'
import {
  NavigationMenuItem,
  NavigationMenuList,
} from '@cads/shared/components/ui/navigation-menu'
import { Toaster } from '@cads/shared/components/ui/sonner'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
})

function RootComponent() {
  const { data, isLoading, error } = useQuery(userIdentify)

  const isLoggedIn = Boolean(data && !isLoading && !error)

  return (
    <>
      <header className="bg-background ring-muted sticky top-0 z-10 box-border p-2 ring-1">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem className="mr-auto">
              <MenuLink to="/" activeOptions={{ exact: true }}>
                <Home className="mr-2 h-4 w-4" />
                Home
              </MenuLink>
            </NavigationMenuItem>
            {isLoggedIn && (
              <>
                <NavigationMenuItem>
                  <MenuLink to="/start" highlight>
                    <ScrollText className="mr-2 h-4 w-4" />
                    Start
                  </MenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <MenuLink to="/logout">
                    <User className="mr-2 h-4 w-4" />
                    Logout
                  </MenuLink>
                </NavigationMenuItem>
              </>
            )}
            {!isLoggedIn && (
              <NavigationMenuItem className="flex flex-grow justify-end">
                <MenuLink to="/login">
                  <User className="mr-2 h-4 w-5" />
                  Login
                </MenuLink>
              </NavigationMenuItem>
            )}
            <NavigationMenuItem>
              <ModeToggle />
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </header>
      <Outlet />
      <Toaster />
      <DevTools />
    </>
  )
}

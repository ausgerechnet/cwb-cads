import { lazy } from 'react'
import {
  Outlet,
  ScrollRestoration,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { NavigationMenu } from '@radix-ui/react-navigation-menu'
import { QueryClient, useQuery } from '@tanstack/react-query'
import { Home, Info, User, ScrollText } from 'lucide-react'

import { userIdentify } from '@cads/shared/queries'
import { ModeToggle } from '@cads/shared/components/mode-toggle'
import { MenuLink } from '@/components/menu-link'
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

// Lazy load devtools in development, but omit in production
const Devtools =
  process.env.NODE_ENV === 'production'
    ? () => null
    : lazy(() =>
        import('@/components/dev-tools').then((res) => ({
          default: res.DevTools,
        })),
      )

function RootComponent() {
  const { data, isLoading, error } = useQuery(userIdentify)

  const isLoggedIn = Boolean(data && !isLoading && !error)

  return (
    <>
      <header className="bg-background ring-muted sticky top-0 z-10 box-border p-2 ring-1">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <MenuLink to="/" activeOptions={{ exact: true }}>
                <Home className="mr-2 h-4 w-4" />
                Mixed Methods Discourse Analysis
              </MenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem className="flex-grow justify-end">
              <MenuLink to="/vignette">
                <Info className="mr-2 h-4 w-4" />
                Vignette
              </MenuLink>
            </NavigationMenuItem>
            {isLoggedIn && (
              <>
                <NavigationMenuItem>
                  <MenuLink to="/queries" highlight>
                    <ScrollText className="mr-2 h-4 w-4" />
                    Analysis
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
      <ScrollRestoration getKey={(location) => location.pathname} />
      <Toaster />
      <Devtools />
    </>
  )
}

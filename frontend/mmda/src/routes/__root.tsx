import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { NavigationMenu } from '@radix-ui/react-navigation-menu'
import { QueryClient, useQuery } from '@tanstack/react-query'
import { Home, Info, User, ScrollText } from 'lucide-react'
import { z } from 'zod'

import { userIdentify } from '@cads/shared/queries'
import { ModeToggle } from '@cads/shared/components/mode-toggle'
import { MenuLink } from '@/components/menu-link'
import {
  NavigationMenuItem,
  NavigationMenuList,
} from '@cads/shared/components/ui/navigation-menu'
import { Toaster } from '@cads/shared/components/ui/sonner'
import { DiscoursemeCollocateTableSearch } from '@/components/discourseme-collocate-table'
import { DiscoursemeBreakdownSearch } from '@/components/discourseme-breakdown'
import { measures } from '@cads/shared/components/measures'
import { DevTools } from '@/components/dev-tools'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
  validateSearch: z
    .object({})
    .merge(DiscoursemeCollocateTableSearch)
    .merge(DiscoursemeBreakdownSearch)
    .merge(
      z.object({
        clContextBreak: z.string().optional().catch(undefined),
        contextBreak: z.string().optional().catch(undefined),
        clFilterDiscoursemeIds: z.number().int().array().optional().catch([]),
        clSortOrder: z
          .enum(['ascending', 'descending', 'random', 'first'] as const)
          .optional()
          .catch(undefined),
        clSortByOffset: z.number().int().optional().catch(undefined),
        clPageSize: z.number().positive().int().optional().catch(undefined),
        clPageIndex: z.number().nonnegative().int().optional().catch(undefined),
        clFilterItem: z.string().optional().catch(undefined),
        clFilterItemPAtt: z.string().optional().catch(undefined),

        ccFilterDiscoursemeIds: z.number().int().array().optional().catch([]),
        ccPageNumber: z
          .number()
          .nonnegative()
          .int()
          .optional()
          .catch(undefined),
        ccSortOrder: z
          .enum(['ascending', 'descending'] as const)
          .optional()
          .catch('descending'),
        ccSortBy: z.enum(measures).optional().catch(undefined),
        semanticMapId: z.number().optional().catch(undefined),

        corpusId: z.number().optional().catch(undefined),
        subcorpusId: z.number().optional().catch(undefined),
        focusDiscourseme: z.number().optional().catch(undefined),
        isConcordanceVisible: z.boolean().optional().catch(true),

        pAtt: z.string().optional(),
        windowSize: z
          .number()
          .positive()
          .min(2)
          .int()
          .optional()
          .catch(undefined),
        primary: z.string().optional(),
        secondary: z.string().optional().catch(undefined),
      }),
    ),
})

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
            {process.env.NODE_ENV === 'development' && (
              <NavigationMenuItem>
                <MenuLink to="/components">
                  <span className="mr-2 h-4 w-4">🛠️</span>
                  Component Overview (DEV only)
                </MenuLink>
              </NavigationMenuItem>
            )}
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
      <Toaster />
      <DevTools />
    </>
  )
}

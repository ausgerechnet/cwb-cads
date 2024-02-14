import { ComponentProps } from 'react'
import {
  BookCopy,
  Crown,
  FormInput,
  MessagesSquare,
  TextSelection,
  WholeWord,
  MessageSquare,
} from 'lucide-react'
import { Outlet, createLazyFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { sessionQueryOptions } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { navigationMenuTriggerStyle } from '@/components/ui/navigation-menu'

export const Route = createLazyFileRoute('/_app')({
  component: () => <App />,
})

function App() {
  // TODO: Endpoint does not return user role right now.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const isAdmin = useQuery(sessionQueryOptions)?.data?.username === 'admin'

  return (
    <main className="flex">
      <div>
        <nav className="sticky top-14 flex flex-col gap-0.5 p-2">
          <AppMenuLink to="/queries">
            <FormInput className="mr-2 h-4 w-4 flex-shrink-0" />
            Queries
          </AppMenuLink>
          <AppMenuLink to="/collocation-analysis">
            <TextSelection className=" mr-2 h-4 w-4 flex-shrink-0" />
            Collocation Analysis
          </AppMenuLink>
          <AppMenuLink to="/keyword-analysis">
            <WholeWord className="mr-2 h-4 w-4 flex-shrink-0" />
            Keyword Analysis
          </AppMenuLink>
          <AppMenuLink to="/discoursemes">
            <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />
            Discoursemes
          </AppMenuLink>
          <AppMenuLink to="/constellations">
            <MessagesSquare className="mr-2 h-4 w-4 flex-shrink-0" />
            Constellations
          </AppMenuLink>
          <AppMenuLink to="/subcorpora">
            <BookCopy className="mr-2 h-4 w-4 flex-shrink-0" />
            Subcorpora
          </AppMenuLink>
          {isAdmin && (
            <AppMenuLink to="/admin">
              <Crown className="mr-2 h-4 w-4 flex-shrink-0" />
              Admin
            </AppMenuLink>
          )}
        </nav>
      </div>

      <div className="flex-grow p-2">
        <Outlet />
      </div>
    </main>
  )
}

function AppMenuLink({
  className,
  activeProps,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      preloadDelay={250}
      {...props}
      activeProps={{
        ...activeProps,
        className: 'bg-muted',
      }}
      className={cn(
        navigationMenuTriggerStyle(),
        'mx-0 flex w-auto justify-start whitespace-nowrap',
        className,
      )}
    />
  )
}

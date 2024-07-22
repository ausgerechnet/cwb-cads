import {
  useState,
  ComponentProps,
  JSXElementConstructor,
  ReactNode,
  useEffect,
  useCallback,
} from 'react'
import {
  BookCopy,
  Crown,
  FormInput,
  MessagesSquare,
  WholeWord,
  MessageSquare,
  ArrowLeftToLine,
} from 'lucide-react'
import { Outlet, createLazyFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { sessionQueryOptions } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { navigationMenuTriggerStyle } from '@/components/ui/navigation-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export const Route = createLazyFileRoute('/_app')({
  component: () => <App />,
})

function App() {
  // TODO: Endpoint does not return user role right now.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const isAdmin = useQuery(sessionQueryOptions)?.data?.username === 'admin'
  const [isSmall, setIsSmall] = useState(
    localStorage.getItem('small-menu') === 'true',
  )
  const toggleSmall = useCallback(
    () =>
      setIsSmall((current) => {
        const newValue = !current
        localStorage.setItem('small-menu', String(newValue))
        return newValue
      }),
    [setIsSmall],
  )

  useEffect(() => {
    function handleKeyPress(event: KeyboardEvent) {
      if (
        event.key === 'c' &&
        !event.metaKey &&
        !event.ctrlKey &&
        event.altKey
      ) {
        event.preventDefault()
        toggleSmall()
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [toggleSmall])

  return (
    <main className="flex">
      <div className="border-r-1 sticky top-14 z-10 h-[calc(100svh-3.5rem)] border-r border-r-muted">
        <ScrollArea className="h-full">
          <nav className="flex h-full min-h-[calc(100svh-3.75rem)] flex-col gap-0.5 p-2 ">
            <AppMenuLink to="/queries" icon={FormInput}>
              Queries
            </AppMenuLink>
            <AppMenuLink to="/keyword-analysis" icon={WholeWord}>
              Keyword Analysis
            </AppMenuLink>
            <AppMenuLink to="/discoursemes" icon={MessageSquare}>
              Discoursemes
            </AppMenuLink>
            <AppMenuLink to="/constellations" icon={MessagesSquare}>
              Constellations
            </AppMenuLink>
            <AppMenuLink to="/subcorpora" icon={BookCopy}>
              Subcorpora
            </AppMenuLink>
            {isAdmin && (
              <AppMenuLink to="/admin" icon={Crown}>
                Admin
              </AppMenuLink>
            )}
            <TooltipProvider disableHoverableContent={!isSmall}>
              <Tooltip open={isSmall === false ? false : undefined}>
                <TooltipTrigger asChild>
                  <Button
                    className={cn(
                      navigationMenuTriggerStyle(),
                      'mx-0 mt-auto flex w-auto justify-start whitespace-nowrap',
                    )}
                    size="icon"
                    variant="ghost"
                    onClick={toggleSmall}
                  >
                    <ArrowLeftToLine
                      className={cn('h-4 w-4', isSmall ? 'rotate-180' : 'mr-2')}
                    />
                    {!isSmall && (
                      <>
                        Collapse Menu
                        <kbd className="border-1 ml-2 mr-0 rounded-sm border border-muted px-1 py-0.5 text-xs">
                          alt c
                        </kbd>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Expand Menu{' '}
                  <kbd className="border-1 ml-2 mr-0 rounded-sm border border-muted px-1 py-0.5 text-xs">
                    alt c
                  </kbd>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </nav>
        </ScrollArea>
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
  icon: Icon,
  children,
  ...props
}: ComponentProps<typeof Link> & {
  children: ReactNode
  icon: JSXElementConstructor<{ className?: string }>
}) {
  const isSmall = localStorage.getItem('small-menu') === 'true'
  return (
    <TooltipProvider disableHoverableContent={!isSmall}>
      <Tooltip open={isSmall === false ? false : undefined}>
        <TooltipTrigger asChild>
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
          >
            {Icon && (
              <Icon
                className={cn('h-4 w-4 flex-shrink-0', !isSmall && 'mr-2')}
              />
            )}
            {isSmall ? null : <>{children}</>}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

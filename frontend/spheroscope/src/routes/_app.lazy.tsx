import {
  useState,
  ComponentProps,
  JSXElementConstructor,
  ReactNode,
  useEffect,
  useCallback,
} from 'react'
import { ArrowLeftToLineIcon, BookIcon } from 'lucide-react'
import { Outlet, createLazyFileRoute, Link } from '@tanstack/react-router'

import { cn } from '@cads/shared/lib/utils'
import { navigationMenuTriggerStyle } from '@cads/shared/components/ui/navigation-menu'
import { ScrollArea } from '@cads/shared/components/ui/scroll-area'
import { Button } from '@cads/shared/components/ui/button'
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@cads/shared/components/ui/tooltip'

export const Route = createLazyFileRoute('/_app')({
  component: () => <App />,
})

function App() {
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
      <div className="border-r-1 border-r-muted sticky top-14 z-20 h-[calc(100svh-3.5rem)] border-r">
        <ScrollArea className="h-full">
          <nav className="flex h-full min-h-[calc(100svh-3.75rem)] flex-col gap-0.5 p-2">
            <AppMenuLink to="/start" icon={BookIcon}>
              Start
            </AppMenuLink>
            <TooltipProvider disableHoverableContent={!isSmall}>
              <Tooltip open={!isSmall ? false : undefined}>
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
                    <ArrowLeftToLineIcon
                      className={cn('h-4 w-4', isSmall ? 'rotate-180' : 'mr-2')}
                    />
                    {!isSmall && (
                      <>
                        Collapse Menu
                        <kbd className="border-1 border-muted ml-2 mr-0 rounded-sm border px-1 py-0.5 text-xs">
                          alt c
                        </kbd>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Expand Menu{' '}
                  <kbd className="border-1 border-muted ml-2 mr-0 rounded-sm border px-1 py-0.5 text-xs">
                    alt c
                  </kbd>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </nav>
        </ScrollArea>
      </div>

      <div className="flex flex-grow flex-col">
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
      <Tooltip open={!isSmall ? false : undefined}>
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

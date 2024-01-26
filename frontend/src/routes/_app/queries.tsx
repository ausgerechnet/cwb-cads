import { AlertCircle, Plus } from 'lucide-react'
import { ReactNode } from 'react'
import { ErrorRouteProps, FileRoute, Link } from '@tanstack/react-router'

import { cn } from '@/lib/utils'
import { queriesQueryOptions } from '@/data/queries'
import { buttonVariants } from '@/components/ui/button'
import { Headline1, Large } from '@/components/ui/typography'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export const Route = new FileRoute('/_app/queries').createRoute({
  component: Queries,
  pendingComponent: QueriesPending,
  errorComponent: QueriesError,
  loader: async ({ context: { queryClient } }) => ({
    queries: await queryClient.ensureQueryData(queriesQueryOptions),
  }),
})

function Queries() {
  const { queries } = Route.useLoaderData()
  return (
    <QueriesFrame>
      {queries.length === 0 && (
        <div className="start flex flex-col gap-4">
          <Large>
            No queries yet.
            <br />
            Create one using the button below.
          </Large>
          <Link
            to="/queries/new"
            className={cn(buttonVariants(), 'self-start')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Query
          </Link>
        </div>
      )}
      {queries.map((query) => (
        <div
          key={query.id}
          className="mono flex flex-col gap-2 whitespace-pre rounded-md bg-muted p-2 text-sm leading-tight text-muted-foreground"
        >
          {JSON.stringify(query, null, 2)}
        </div>
      ))}
    </QueriesFrame>
  )
}

function QueriesError({ error }: ErrorRouteProps) {
  const errorMessage =
    typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : 'Unknown error'
  return (
    <QueriesFrame>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>An error occurred while loading the queries.</AlertTitle>
        <AlertDescription className="whitespace-pre">
          {errorMessage}
        </AlertDescription>
      </Alert>
    </QueriesFrame>
  )
}

function QueriesFrame({ children }: { children: ReactNode }) {
  return (
    <div className="p-2">
      <div className="mb-8 flex gap-4">
        <Headline1 className="flex-grow">Queries Overview</Headline1>
        <Link to="/queries/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          New Query
        </Link>
      </div>
      <div className="col-span-full">{children}</div>
    </div>
  )
}

function QueriesPending() {
  return (
    <QueriesFrame>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    </QueriesFrame>
  )
}

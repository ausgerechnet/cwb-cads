import { Plus } from 'lucide-react'
import { ReactNode } from 'react'
import { FileRoute, Link } from '@tanstack/react-router'

import { queriesQueryOptions } from '@/data/queries'
import { buttonVariants } from '@/components/ui/button'
import { Headline1, Large } from '@/components/ui/typography'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export const Route = new FileRoute('/_app/queries').createRoute({
  component: Queries,
  pendingComponent: QueriesPending,
  loader: async ({ context: { queryClient } }) => {
    return {
      queries: await queryClient.ensureQueryData(queriesQueryOptions),
    }
  },
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
      {queries.length > 0 && <p>Queries: {queries.length}</p>}
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

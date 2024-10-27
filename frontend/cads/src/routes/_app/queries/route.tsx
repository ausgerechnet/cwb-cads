import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { queriesList } from '@/queries/queries'
import { Skeleton } from '@cads/shared/components/ui/skeleton'
import { QueriesLayout } from './-queries-layout'

export const Route = createFileRoute('/_app/queries')({
  pendingComponent: QueriesPending,
  validateSearch: z.object({
    pageIndex: z.number().int().nonnegative().optional().catch(0),
    pageSize: z.number().positive().optional(),
  }),
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(queriesList),
})

function QueriesPending() {
  return (
    <QueriesLayout>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    </QueriesLayout>
  )
}

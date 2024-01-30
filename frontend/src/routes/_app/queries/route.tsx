import { AlertCircle } from 'lucide-react'
import { ErrorComponentProps, createFileRoute } from '@tanstack/react-router'
import { queriesQueryOptions } from '@/lib/queries'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { QueriesLayout } from './-queries-layout'

export const Route = createFileRoute('/_app/queries')({
  errorComponent: QueriesError,
  loader: async ({ context: { queryClient } }) => ({
    queries: await queryClient.ensureQueryData(queriesQueryOptions),
  }),
})

function QueriesError({ error }: ErrorComponentProps) {
  const errorMessage =
    typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : 'Unknown error'
  return (
    <QueriesLayout>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>An error occurred while loading the queries.</AlertTitle>
        <AlertDescription className="whitespace-pre">
          {errorMessage}
        </AlertDescription>
      </Alert>
    </QueriesLayout>
  )
}
export default function QueriesPending() {
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

import {
  ErrorComponentProps,
  Link,
  createLazyFileRoute,
} from '@tanstack/react-router'
import { AlertCircle } from 'lucide-react'

import { AppPageFrame } from '@/components/app-page-frame'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Headline2, Large } from '@/components/ui/typography'
import { QueryBreakdown } from './-query-breakdown'

export const Route = createLazyFileRoute('/_app/queries/$queryId')({
  component: SingleQuery,
  errorComponent: SingleQueryError,
})

function SingleQuery() {
  const { queryId } = Route.useParams()

  return (
    <AppPageFrame title="Query">
      <div className="flex flex-col gap-4">
        <Headline2>Breakdown</Headline2>
        <QueryBreakdown queryId={queryId} />
      </div>
    </AppPageFrame>
  )
}

function SingleQueryError({ error }: ErrorComponentProps) {
  // @ts-expect-error the error type is unknown
  const isMissingError = error?.response?.status === 404

  if (isMissingError) {
    return (
      <AppPageFrame title="Query 404">
        <Large>
          Query not found.
          <br />
          Return to the{' '}
          <Link to="/queries" className="underline">
            Query overview
          </Link>
          .
        </Large>
      </AppPageFrame>
    )
  }

  return (
    <AppPageFrame title="Query">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>An error occurred while loading the query.</AlertTitle>
        {Boolean(error) && <AlertDescription>{String(error)}</AlertDescription>}
      </Alert>
    </AppPageFrame>
  )
}

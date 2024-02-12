import { useState } from 'react'
import {
  ErrorComponentProps,
  Link,
  createLazyFileRoute,
  useRouter,
} from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertCircle, Loader2 } from 'lucide-react'

import {
  patchQueryMutationOptions,
  queryConcordancesQueryOptions,
} from '@/lib/queries'
import { errorString } from '@/lib/error-string'
import { AppPageFrame } from '@/components/app-page-frame'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Headline2, Large } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { DiscoursemeSelect } from '@/components/select-discourseme'
import { ErrorMessage } from '@/components/error-message'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBreakdown } from './-query-breakdown'

export const Route = createLazyFileRoute('/_app/queries/$queryId')({
  component: SingleQuery,
  errorComponent: SingleQueryError,
})

function SingleQuery() {
  const { queryId } = Route.useParams()
  const { queryDiscourseme } = Route.useLoaderData()
  const { data, isLoading } = useQuery(queryConcordancesQueryOptions(queryId))

  return (
    <AppPageFrame title="Query">
      <div className="flex flex-col gap-4">
        {queryDiscourseme ? <Discourseme /> : <AttachDiscourseme />}
        <Headline2>Breakdown</Headline2>
        <QueryBreakdown queryId={queryId} />
        {data && (
          <div className="whitespace-pre-wrap rounded-md bg-muted p-2 font-mono text-sm leading-tight text-muted-foreground">
            {JSON.stringify(data, null, 2)}
          </div>
        )}
        {isLoading && <Skeleton className="h-52 w-full rounded-md" />}
      </div>
    </AppPageFrame>
  )
}

function Discourseme() {
  const { queryDiscourseme } = Route.useLoaderData()
  if (!queryDiscourseme) return null

  return (
    <div>
      <Headline2>Discourseme</Headline2>
      <div className="grid grid-cols-[auto_auto] gap-3">
        <span>Id:</span>
        <span>{queryDiscourseme.id}</span>
        <span>Items:</span>
        <span>
          {queryDiscourseme._items?.join(', ') ?? (
            <span className="italic">empty</span>
          )}
        </span>
      </div>
    </div>
  )
}

function AttachDiscourseme() {
  const { discoursemes, query } = Route.useLoaderData()
  const [discoursemeId, setDiscoursemeId] = useState<number | undefined>()
  const router = useRouter()
  const { mutate, isPending, error } = useMutation({
    ...patchQueryMutationOptions,
    onSuccess: (...args) => {
      patchQueryMutationOptions.onSuccess?.(...args)
      router.invalidate()
    },
  })

  const queryId = query.id

  const attachDiscourseme = () => {
    if (!queryId) return
    mutate({
      queryId: queryId.toString(),
      discourseme_id: discoursemeId,
    })
  }

  return (
    <div>
      <Headline2>No discourseme attached</Headline2>
      <DiscoursemeSelect
        discoursemes={discoursemes}
        discoursemeId={discoursemeId}
        onChange={setDiscoursemeId}
      />
      <Button onClick={attachDiscourseme} disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Attach
      </Button>
      <ErrorMessage error={error} />
    </div>
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
        {Boolean(error) && (
          <AlertDescription>{errorString(error)}</AlertDescription>
        )}
      </Alert>
    </AppPageFrame>
  )
}

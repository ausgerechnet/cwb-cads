import { useState } from 'react'
import {
  ErrorComponentProps,
  Link,
  createLazyFileRoute,
  useRouter,
} from '@tanstack/react-router'
import {
  useMutation,
  useSuspenseQueries,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { AlertCircle, Loader2 } from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'

import { schemas } from '@/rest-client'
import {
  discoursemesQueryOptions,
  patchQueryMutationOptions,
  queryQueryOptions,
} from '@/lib/queries'
import { errorString } from '@/lib/error-string'
import { AppPageFrame } from '@/components/app-page-frame'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Headline3, Large } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { DiscoursemeSelect } from '@/components/select-discourseme'
import { ErrorMessage } from '@/components/error-message'
import { QuickCreateDiscourseme } from '@/components/quick-create-discourseme'
import { Card } from '@/components/ui/card'
import { QueryBreakdown } from './-query-breakdown'
import { ConcordanceLines } from '@/components/concordance-lines'

export const Route = createLazyFileRoute('/_app/queries/$queryId')({
  component: SingleQuery,
  errorComponent: SingleQueryError,
})

function SingleQuery() {
  const { queryId } = Route.useParams()
  const { query, queryDiscourseme } = useSuspenseQueries({
    queries: [queryQueryOptions(queryId), discoursemesQueryOptions],
    combine: ([query, discoursemes]) => {
      const queryDiscourseme = discoursemes.data?.find(
        (discourseme) => discourseme.id === query.data?.discourseme_id,
      )
      return { query, queryDiscourseme }
    },
  })

  return (
    <AppPageFrame title="Query">
      <div className="grid grid-cols-3 grid-rows-[max-content_1fr_auto] gap-8">
        <Card className="mb-auto p-4 font-mono">
          <Headline3>Query</Headline3>
          <div className="whitespace-pre-line rounded-md bg-muted p-2 text-muted-foreground">
            {query.data?.cqp_query}
          </div>
        </Card>
        <Card className="align-start row-start-2 mb-auto p-4">
          {queryDiscourseme ? (
            <Discourseme discourseme={queryDiscourseme} />
          ) : (
            <AttachDiscourseme />
          )}
        </Card>
        <Card className="col-span-2 row-span-2 p-4">
          <Headline3>Breakdown</Headline3>
          <QueryBreakdown queryId={queryId} />
        </Card>

        <ConcordanceLines className="col-span-full" />
      </div>
    </AppPageFrame>
  )
}

function Discourseme({
  discourseme,
}: {
  discourseme: z.infer<typeof schemas.DiscoursemeOut>
}) {
  if (!discourseme) return null

  return (
    <>
      <Headline3>Discourseme</Headline3>
      <div className="grid grid-cols-[auto_auto] gap-3">
        <span>Id:</span>
        <span>{discourseme.id}</span>
        <span>Name:</span>
        <span>{discourseme.name}</span>
        <span>Description:</span>
        <span>{discourseme.description}</span>
        <span>Items:</span>
        <span>
          {discourseme._items?.join(', ') ?? (
            <span className="italic">empty</span>
          )}
        </span>
      </div>
    </>
  )
}

function AttachDiscourseme() {
  const { queryId } = Route.useParams()
  const { data: discoursemes } = useSuspenseQuery(discoursemesQueryOptions)
  const [discoursemeId, setDiscoursemeId] = useState<number | undefined>()
  const router = useRouter()
  const { mutate, isPending, error } = useMutation({
    ...patchQueryMutationOptions,
    onSuccess: (...args) => {
      patchQueryMutationOptions.onSuccess?.(...args)
      router.invalidate()
      toast.success('Discourseme attached')
    },
    onError: (...args) => {
      patchQueryMutationOptions.onError?.(...args)
      toast.error('Failed to attach discourseme')
    },
  })

  const attachDiscourseme = () => {
    if (!queryId) return
    mutate({
      queryId: queryId.toString(),
      discourseme_id: discoursemeId,
    })
  }

  return (
    <>
      <div className="flex flex-wrap gap-4 @container">
        <Headline3 className="w-full">No discourseme attached</Headline3>
        <DiscoursemeSelect
          className="flex-grow"
          discoursemes={discoursemes}
          discoursemeId={discoursemeId}
          onChange={setDiscoursemeId}
        />
        <QuickCreateDiscourseme className="w-full @xs:w-8" />
        <Button
          className="w-full flex-grow"
          onClick={attachDiscourseme}
          disabled={isPending}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Attach
        </Button>
      </div>
      <ErrorMessage error={error} />
    </>
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

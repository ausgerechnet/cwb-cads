import { createLazyFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Loader2, Plus } from 'lucide-react'

import { schemas } from '@/rest-client'
import {
  subcorporaQueryOptions,
  putSubcorpusMutationOptions,
  corporaQueryOptions,
} from '@/lib/queries'
import { AppPageFrame } from '@/components/app-page-frame'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ErrorMessage } from '@/components/error-message'

export const Route = createLazyFileRoute('/_app/subcorpora')({
  component: Subcorpora,
  pendingComponent: LoaderSubcorpora,
})

function Subcorpora() {
  const { data: corpora } = useSuspenseQuery(corporaQueryOptions)

  return (
    <AppPageFrame
      title="Subcorpora"
      cta={{
        nav: { to: '/subcorpora/new' },
        label: 'New Subcorpus',
      }}
    >
      {corpora.map((corpus) => (
        <Corpus corpus={corpus} key={corpus.id} />
      ))}
    </AppPageFrame>
  )
}

function Corpus({ corpus }: { corpus: z.infer<typeof schemas.CorpusOut> }) {
  const corpusId = String(corpus.id ?? '')
  const {
    data: subcorpora,
    isLoading,
    error,
  } = useQuery(subcorporaQueryOptions(corpusId))
  const {
    mutate: newSubcorpus,
    isPending,
    error: putError,
  } = useMutation(putSubcorpusMutationOptions)
  return (
    <div className="my-4">
      {corpus.name}
      <p>{corpus.description}</p>
      {isLoading && <Loader2 className="m-2 h-4 w-4 animate-spin" />}
      {subcorpora?.map((subcorpus) => (
        <div key={subcorpus.id}>
          {subcorpus.name}
          <p>{subcorpus.description}</p>
        </div>
      ))}
      {subcorpora?.length === 0 && (
        <p className="rounded-md bg-muted px-2 py-1 text-muted-foreground">
          No subcorpora yet.
        </p>
      )}
      <Button onClick={() => newSubcorpus(corpusId)} disabled={isPending}>
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        New Subcorpus
      </Button>
      <ErrorMessage error={putError} />
      <ErrorMessage error={error} />
    </div>
  )
}

function LoaderSubcorpora() {
  return (
    <AppPageFrame
      title="Subcorpora"
      cta={{
        nav: { to: '/subcorpora/new' },
        label: 'New Subcorpus',
      }}
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    </AppPageFrame>
  )
}

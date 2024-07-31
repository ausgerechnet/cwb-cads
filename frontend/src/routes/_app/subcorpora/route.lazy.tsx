import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'
import {
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  EyeIcon,
  Loader2,
} from 'lucide-react'

import { schemas } from '@/rest-client'
import { subcorpusById, corpusList } from '@/lib/queries'
import { AppPageFrame } from '@/components/app-page-frame'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorMessage } from '@/components/error-message'
import { Table, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const Route = createLazyFileRoute('/_app/subcorpora')({
  component: Subcorpora,
  pendingComponent: LoaderSubcorpora,
})

function Subcorpora() {
  const { data: corpora } = useSuspenseQuery(corpusList)

  return (
    <AppPageFrame
      title="Subcorpora"
      cta={{
        nav: { to: '/subcorpora/new' },
        label: 'New Subcorpus',
      }}
    >
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Subcorpora #</TableCell>
              <TableCell />
            </TableRow>
          </TableHeader>
          {corpora.map((corpus) => (
            <Corpus corpus={corpus} key={corpus.id} />
          ))}
        </Table>
      </div>
    </AppPageFrame>
  )
}

function Corpus({ corpus }: { corpus: z.infer<typeof schemas.CorpusOut> }) {
  const [expanded, setExpanded] = useState(false)
  const toggleExpanded = () => setExpanded((prev) => !prev)
  const corpusId = String(corpus.id ?? '')
  const {
    data: subcorpora,
    isLoading,
    error,
  } = useQuery(subcorpusById(corpusId))
  const hasSubcorpora = (subcorpora?.length ?? 0) > 0

  return (
    <>
      <TableRow className={'my-4'}>
        <TableCell>{corpus.name}</TableCell>
        <TableCell>{corpus.description ?? 'n/a'}</TableCell>
        <TableCell>
          {isLoading ? (
            <Loader2 className="m-2 h-4 w-4 animate-spin" />
          ) : (
            subcorpora?.length ?? 0
          )}
          <ErrorMessage error={error} />
        </TableCell>
        <TableCell>
          {hasSubcorpora && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleExpanded}
              className="-my-3"
            >
              {expanded ? (
                <ChevronsDownUpIcon className="h-4 w-4" />
              ) : (
                <ChevronsUpDownIcon className="h-4 w-4" />
              )}
            </Button>
          )}
        </TableCell>
      </TableRow>
      {expanded &&
        subcorpora?.map((subcorpus) => (
          <TableRow key={subcorpus.id} className="dashed-b py-0">
            <TableCell className="py-2 pl-8">{subcorpus.name}</TableCell>
            <TableCell className="py-2" colSpan={2}>
              {subcorpus.description}
            </TableCell>
            <TableCell className="py-0">
              <Link
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'icon' }),
                  '-my-1',
                )}
                to="/subcorpora/$subcorpusId"
                params={{
                  subcorpusId: String(subcorpus.id),
                }}
              >
                <EyeIcon className="h-4 w-4" />
              </Link>
            </TableCell>
          </TableRow>
        ))}
    </>
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

import { z } from 'zod'
import { PlusIcon } from 'lucide-react'
import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'

import { schemas } from '@/rest-client'
import {
  corpusById,
  deleteDiscoursemeDescription,
  discoursemeById,
  discoursemeDescriptionsById,
} from '@cads/shared/queries'
import { AppPageFrame } from '@/components/app-page-frame'
import { Large } from '@cads/shared/components/ui/typography'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { cn } from '@cads/shared/lib/utils'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { Card } from '@cads/shared/components/ui/card'
import { ButtonAlert } from '@/components/button-alert'
import { DataTable } from '@cads/shared/components/data-table'
import { Skeleton } from '@cads/shared/components/ui/skeleton'

export const Route = createLazyFileRoute('/_app/discoursemes_/$discoursemeId')({
  component: SingleDiscourseme,
})

function SingleDiscourseme() {
  const discoursemeId = parseInt(Route.useParams().discoursemeId)
  const { data: discourseme } = useSuspenseQuery(discoursemeById(discoursemeId))
  const { data: descriptions } = useSuspenseQuery(
    discoursemeDescriptionsById(discoursemeId),
  )
  const name = discourseme?.name
  const comment = discourseme?.comment
  const template = discourseme?.template ?? []

  return (
    <AppPageFrame
      title={name ? `Discourseme: ${name}` : 'Discourseme'}
      cta={{
        label: 'New description',
        nav: {
          to: '/discoursemes/$discoursemeId/new-description',
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          params: { discoursemeId: discoursemeId.toString() },
        },
      }}
    >
      <Card className="grid max-w-lg grid-cols-[auto,1fr] gap-4 gap-y-0.5 p-4">
        <strong>Comment:</strong>
        <span>
          {comment ? (
            comment
          ) : (
            <span className="text-muted-foreground italic">n.a.</span>
          )}
        </span>
        <strong>Template:</strong>
        {template.length > 0 && (
          <div>{template.map((t) => t.surface).join(', ')}</div>
        )}
      </Card>

      {descriptions.length === 0 && (
        <div className="start flex flex-col gap-4">
          <Large>
            No discourseme descriptions yet.
            <br />
            Create one using the button below.
          </Large>
          <Link
            to="/discoursemes/$discoursemeId/new-description"
            params={{ discoursemeId: discoursemeId.toString() }}
            className={cn(buttonVariants(), 'self-start')}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Create New Description
          </Link>
        </div>
      )}

      <Card className="mr-auto mt-6 flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          {descriptions.length > 0 && <Large>Descriptions</Large>}

          <Link
            to="/discoursemes/$discoursemeId/new-description"
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            params={{ discoursemeId: discoursemeId.toString() }}
            className={buttonVariants()}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Create New Description
          </Link>
        </div>

        <DataTable<z.infer<typeof schemas.DiscoursemeDescriptionOut>>
          className="mt-2"
          columns={columns}
          rows={descriptions}
        />
      </Card>
    </AppPageFrame>
  )
}

const columns: ColumnDef<z.infer<typeof schemas.DiscoursemeDescriptionOut>>[] =
  [
    {
      accessorKey: 'id',
      header: 'ID',
    },
    {
      accessorKey: 'corpus_id',
      header: 'Corpus/Subcorpus',
      cell: ({ row }) => {
        const corpusId = row.original.corpus_id
        const subcorpusId = row.original.subcorpus_id
        return <CorpusName corpusId={corpusId} subcorpusId={subcorpusId} />
      },
    },
    {
      id: 'layer',
      header: 'Layer',
      cell: ({ row }) =>
        row.original.items?.find((item) => item.p)?.p ?? 'n.a.',
    },
    {
      id: 'items',
      header: 'Surfaces',
      cell: ({ row }) => {
        const surfaces = row.original.items
          .map((item) => item.surface)
          .join(', ')
        return <span className="max-w-[200px] truncate">{surfaces}</span>
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DeleteButton
          descriptionId={row.original.id}
          discoursemeId={row.original.discourseme_id}
        />
      ),
      meta: { className: 'w-0' },
    },
  ]

function CorpusName({
  corpusId,
  subcorpusId,
}: {
  corpusId: number
  subcorpusId?: number | null
}) {
  const { data, isLoading, error } = useQuery(corpusById(corpusId, subcorpusId))
  if (error) return <ErrorMessage error={error} />
  if (isLoading) return <Skeleton className="h-4 w-36 max-w-full" />
  return (
    <>
      {(data?.corpus as { name?: string })?.name && (
        <span className="text-muted-foreground">
          {(data?.corpus as { name: string }).name}{' '}
        </span>
      )}
      <span>{data?.name}</span>
    </>
  )
}

function DeleteButton({
  descriptionId,
  discoursemeId,
}: {
  descriptionId: number
  discoursemeId: number
}) {
  const { mutate, isPending, error } = useMutation(deleteDiscoursemeDescription)

  return (
    <>
      <ButtonAlert
        className="ml-auto mr-0 w-min"
        onClick={() => mutate({ descriptionId, discoursemeId })}
        disabled={isPending}
      />

      <ErrorMessage error={error} />
    </>
  )
}

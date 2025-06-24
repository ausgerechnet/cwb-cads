import { z } from 'zod'
import { PencilIcon } from 'lucide-react'
import { createLazyFileRoute } from '@tanstack/react-router'
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
import { DiscoursemeFieldEditor } from './-discourseme-field-editor'
import { useId } from 'react'

export const Route = createLazyFileRoute('/_app/discoursemes_/$discoursemeId')({
  component: SingleDiscourseme,
})

function SingleDiscourseme() {
  const nameInputId = useId()
  const commentInputId = useId()
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
      title={
        name ? (
          <>
            Discourseme:{' '}
            <label
              htmlFor={nameInputId}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon' }),
                'mr-0.5 h-6 w-6 p-0 align-top',
              )}
            >
              <PencilIcon className="h-4 w-4" />
            </label>
            <DiscoursemeFieldEditor
              defaultValue={name}
              field="name"
              discoursemeId={discoursemeId}
              id={nameInputId}
            />
          </>
        ) : (
          'Discourseme'
        )
      }
      cta={{
        label: 'New Constellation',
        nav: {
          to: '/constellations/new',
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          search: { defaultDiscoursemeIds: [discoursemeId] },
        },
      }}
    >
      <Card className="grid max-w-5xl grid-cols-[auto,1fr] gap-4 gap-y-0.5 p-4">
        <label
          htmlFor={commentInputId}
          className="hover:bg-muted cursor-pointer rounded-md"
        >
          <strong className="flex items-baseline">
            Comment
            <PencilIcon className="ml-1 h-3 w-3" />
          </strong>
        </label>
        <span className="flex justify-between">
          <DiscoursemeFieldEditor
            defaultValue={comment ?? ''}
            field="comment"
            discoursemeId={discoursemeId}
            id={commentInputId}
          />
        </span>
        <strong>Template</strong>
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
        </div>
      )}

      <Card className="mr-auto mt-6 flex w-full max-w-5xl flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          {descriptions.length > 0 && <Large>Descriptions</Large>}
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
      accessorKey: 'query_id',
      header: 'Query ID',
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

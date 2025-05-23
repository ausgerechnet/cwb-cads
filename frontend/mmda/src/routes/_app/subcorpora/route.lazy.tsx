import { createLazyFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ColumnDef } from '@tanstack/react-table'
import { useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { EyeIcon, ScissorsIcon } from 'lucide-react'

import { schemas } from '@/rest-client'
import { subcorporaList } from '@cads/shared/queries'
import { cn } from '@cads/shared/lib/utils'
import { AppPageFrame } from '@/components/app-page-frame'
import { Skeleton } from '@cads/shared/components/ui/skeleton'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { DataTable, SortButton } from '@cads/shared/components/data-table'
import { QuickActions } from '@cads/shared/components/quick-actions'

export const Route = createLazyFileRoute('/_app/subcorpora')({
  component: Subcorpora,
  pendingComponent: LoaderSubcorpora,
})

function Subcorpora() {
  const { data: subcorpora } = useSuspenseQuery(subcorporaList)
  const navigate = useNavigate()

  return (
    <AppPageFrame
      title="Subcorpora"
      cta={{
        nav: { to: '/subcorpora/new' },
        label: 'New Subcorpus',
      }}
    >
      <DataTable
        columns={columns}
        rows={subcorpora}
        onRowClick={(row) =>
          navigate({
            to: '/subcorpora/$subcorpusId',
            params: { subcorpusId: String(row.id) },
          })
        }
      />
    </AppPageFrame>
  )
}

const columns: ColumnDef<z.infer<typeof schemas.SubCorpusOut>>[] = [
  {
    accessorKey: 'id',
    enableSorting: true,
    header: ({ column }) => <SortButton column={column}>ID</SortButton>,
    meta: { className: 'w-0' },
  },
  {
    accessorKey: 'name',
    enableSorting: true,
    header: ({ column }) => <SortButton column={column}>Name</SortButton>,
    meta: { className: 'w-0 whitespace-pre' },
  },
  {
    accessorKey: 'corpus.name',
    enableSorting: true,
    header: ({ column }) => (
      <SortButton column={column}>Parent Corpus</SortButton>
    ),
    meta: { className: 'w-0 whitespace-pre' },
  },
  {
    accessorKey: 'description',
    enableSorting: true,
    header: ({ column }) => (
      <SortButton column={column}>Description</SortButton>
    ),
  },
  {
    id: 'actions',
    header: '',
    meta: { className: 'w-0' },
    cell: ({ row }) => (
      <QuickActions>
        <Link
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            '-my-1',
          )}
          to="/subcorpora/$subcorpusId"
          params={{
            subcorpusId: String(row.id),
          }}
        >
          <EyeIcon className="mr-2 h-4 w-4" /> View Subcorpus
        </Link>

        <Link
          to="/partition"
          search={{
            defaultSubcorpusId: row.original.id,
            defaultCorpusId: row.original.corpus.id,
          }}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'w-full',
          )}
        >
          <ScissorsIcon className="mr-2 h-4 w-4" />
          Create Partition
        </Link>
      </QuickActions>
    ),
  },
]

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

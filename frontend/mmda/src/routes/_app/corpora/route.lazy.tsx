import { createLazyFileRoute, Link, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { EyeIcon, ScissorsIcon } from 'lucide-react'

import { corpusList } from '@cads/shared/queries'
import { AppPageFrame } from '@/components/app-page-frame'
import { Skeleton } from '@cads/shared/components/ui/skeleton'
import { DataTable, SortButton } from '@cads/shared/components/data-table'
import { schemas } from '@/rest-client'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { cn } from '@cads/shared/lib/utils'
import { QuickActions } from '@cads/shared/components/quick-actions'

export const Route = createLazyFileRoute('/_app/corpora')({
  component: CorporaOverview,
  pendingComponent: LoaderCorporaOverview,
})

function CorporaOverview() {
  const { data: corpora } = useSuspenseQuery(corpusList)
  const navigate = useNavigate()
  return (
    <AppPageFrame title="Corpora">
      <DataTable
        rows={corpora}
        columns={columns}
        onRowClick={(row) =>
          navigate({
            to: '/corpora/$corpusId',
            params: { corpusId: String(row.id) },
          })
        }
      />
    </AppPageFrame>
  )
}

const columns: ColumnDef<z.infer<typeof schemas.CorpusOut>>[] = [
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
  },
  {
    accessorKey: 'description',
    enableSorting: true,
    header: ({ column }) => (
      <SortButton column={column}>Description</SortButton>
    ),
  },
  {
    accessorKey: 'language',
    enableSorting: true,
    header: ({ column }) => <SortButton column={column}>Language</SortButton>,
  },
  {
    id: 's_annotations',
    header: 'S Annotations',
    cell: ({ row }) => row.original.s_annotations?.join(', ') ?? '',
  },
  {
    id: 'p_atts',
    header: 'P Att.',
    cell: ({ row }) => row.original.p_atts?.join(', ') ?? '',
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
            'w-full',
          )}
          to="/corpora/$corpusId"
          params={{
            corpusId: String(row.id),
          }}
        >
          <EyeIcon className="mr-2 h-4 w-4" />
          View Corpus
        </Link>

        <Link
          to="/partition"
          search={{
            defaultCorpusId: row.original.id,
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

function LoaderCorporaOverview() {
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

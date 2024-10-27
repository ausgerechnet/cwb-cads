import { createLazyFileRoute, Link, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { EyeIcon } from 'lucide-react'

import { corpusList } from '@/lib/queries'
import { AppPageFrame } from '@/components/app-page-frame'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable, SortButton } from '@/components/data-table'
import { schemas } from '@/rest-client'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
      <Link
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          '-my-1',
        )}
        to="/corpora/$corpusId"
        params={{
          corpusId: String(row.id),
        }}
      >
        <EyeIcon className="h-4 w-4" />
      </Link>
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

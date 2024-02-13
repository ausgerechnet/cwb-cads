import { Eye, Loader2, MoreVertical, Plus, TextSelect } from 'lucide-react'
import {
  Link,
  createLazyFileRoute,
  ErrorComponentProps,
  useRouter,
  useNavigate,
} from '@tanstack/react-router'
import { ColumnDef } from '@tanstack/react-table'
import { useMutation, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { cn } from '@/lib/utils'
import {
  deleteQueryMutationOptions,
  discoursemeQueryOptions,
} from '@/lib/queries'
import { schemas } from '@/rest-client'
import { buttonVariants } from '@/components/ui/button'
import { Large } from '@/components/ui/typography'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { DefaultErrorComponent } from '@/components/default-error-component'
import { DataTable, SortButton } from '@/components/data-table'
import { QueriesLayout } from './-queries-layout'
import { toast } from 'sonner'
import { ButtonAlert } from '@/components/button-alert'

export const Route = createLazyFileRoute('/_app/queries')({
  component: Queries,
  errorComponent: QueriesError,
})

function Queries() {
  const { queries } = Route.useLoaderData()
  const navigate = useNavigate()
  return (
    <QueriesLayout>
      {queries.length === 0 && (
        <div className="start flex flex-col gap-4">
          <Large>
            No queries yet.
            <br />
            Create one using the button below.
          </Large>
          <Link
            to="/queries/new"
            className={cn(buttonVariants(), 'self-start')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Query
          </Link>
        </div>
      )}
      {queries.length > 0 && (
        <DataTable
          columns={columns}
          rows={queries}
          onRowClick={(row) => {
            const queryId = (row.id ?? '').toString()
            navigate({
              to: '/queries/$queryId',
              params: { queryId },
            })
          }}
        />
      )}
    </QueriesLayout>
  )
}

function QueriesError(props: ErrorComponentProps) {
  return (
    <QueriesLayout>
      <DefaultErrorComponent
        title="An error occurred while loading the queries."
        {...props}
      />
    </QueriesLayout>
  )
}

const columns: ColumnDef<z.infer<typeof schemas.QueryOut>>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => <SortButton column={column}>ID</SortButton>,
    meta: { className: 'w-0' },
  },
  {
    accessorKey: 'corpus.name',
    header: ({ column }) => <SortButton column={column}>Corpus</SortButton>,
    meta: { className: 'w-48' },
  },
  {
    accessorKey: 'cqp_query',
    header: ({ column }) => <SortButton column={column}>Query</SortButton>,
  },
  {
    accessorKey: 'discourseme_id',
    header: 'Discourseme (TODO: include in queries response?)',
    cell: (cell) => {
      const discoursemeId = cell.row.original.discourseme_id ?? null
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { data, isLoading } = useQuery({
        ...discoursemeQueryOptions(discoursemeId?.toString() as string),
        enabled: discoursemeId !== null,
      })
      if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />
      return (
        <>{data?._items?.join(', ') || <span className="italic">empty</span>}</>
      )
    },
  },
  {
    accessorKey: 'cqp_nqr_matches',
    header: ({ column }) => (
      <SortButton column={column}>NQR Matches</SortButton>
    ),
  },
  {
    id: 'actions',
    header: '',
    meta: { className: 'w-0' },
    cell: (cell) => {
      const queryId = cell.row.original.id
      if (queryId === undefined) {
        throw new Error('Query ID is undefined')
      }
      return <QuickActions key={queryId} queryId={queryId.toString()} />
    },
  },
]

function QuickActions({ queryId }: { queryId: string }) {
  const router = useRouter()
  const { mutate, isPending, isSuccess } = useMutation({
    ...deleteQueryMutationOptions,
    onSuccess: (...args) => {
      deleteQueryMutationOptions.onSuccess?.(...args)
      router.invalidate()
      toast.success('Query deleted')
    },
    onError: (...args) => {
      deleteQueryMutationOptions.onError?.(...args)
      toast.error('An error occurred while deleting the query')
    },
  })
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          '-my-3',
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <MoreVertical className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent
        className="flex flex-col gap-2 "
        onClick={(event) => event.stopPropagation()}
      >
        <Link
          to="/queries/$queryId"
          params={{ queryId }}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'w-full',
          )}
        >
          <Eye className="mr-2 h-4 w-4" />
          View Query
        </Link>
        <Link
          to="/collocation-analysis/new"
          search={{ queryId: parseInt(queryId) }}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'w-full',
          )}
        >
          <TextSelect className="mr-2 h-4 w-4" />
          Create Collocation Analysis
        </Link>
        <ButtonAlert
          disabled={isPending || isSuccess}
          labelDescription="This will permanently delete the query."
          onClick={() => mutate(queryId)}
        >
          Delete Query
        </ButtonAlert>
      </PopoverContent>
    </Popover>
  )
}

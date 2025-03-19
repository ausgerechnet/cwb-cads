import { Eye, MoreVertical, Plus } from 'lucide-react'
import {
  Link,
  createLazyFileRoute,
  ErrorComponentProps,
  useRouter,
  useNavigate,
} from '@tanstack/react-router'
import { ColumnDef } from '@tanstack/react-table'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from 'sonner'

import { cn } from '@cads/shared/lib/utils'
import { deleteQuery, queriesList } from '@cads/shared/queries'
import { schemas } from '@/rest-client'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { Large } from '@cads/shared/components/ui/typography'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@cads/shared/components/ui/popover'
import { DefaultErrorComponent } from '@/components/default-error-component'
import { DataTable, SortButton } from '@cads/shared/components/data-table'
import { ButtonAlert } from '@/components/button-alert'
import { QueriesLayout } from './-queries-layout'

export const Route = createLazyFileRoute('/_app/queries')({
  component: Queries,
  errorComponent: QueriesError,
})

function Queries() {
  const { data: queries } = useSuspenseQuery(queriesList)
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
            void navigate({
              to: '/queries/$queryId',
              params: { queryId: String(row.id) },
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
    accessorKey: 'corpus_name',
    header: ({ column }) => <SortButton column={column}>Corpus</SortButton>,
    meta: { className: 'w-48' },
  },
  {
    accessorKey: 'cqp_query',
    header: ({ column }) => <SortButton column={column}>Query</SortButton>,
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
    ...deleteQuery,
    onSuccess: (...args) => {
      deleteQuery.onSuccess?.(...args)
      router.invalidate()
      toast.success('Query deleted')
    },
    onError: (...args) => {
      deleteQuery.onError?.(...args)
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
        className="flex flex-col gap-2"
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

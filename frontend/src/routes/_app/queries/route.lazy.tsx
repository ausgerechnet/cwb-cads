import {
  Eye,
  Loader2,
  MoreVertical,
  Plus,
  TextSelect,
  XSquare,
} from 'lucide-react'
import {
  Link,
  createLazyFileRoute,
  ErrorComponentProps,
  useRouter,
  useNavigate,
} from '@tanstack/react-router'
import { ColumnDef } from '@tanstack/react-table'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'

import { cn } from '@/lib/utils'
import { deleteQueryMutationOptions } from '@/lib/queries'
import { schemas } from '@/rest-client'
import { Button, buttonVariants } from '@/components/ui/button'
import { Large } from '@/components/ui/typography'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { DefaultErrorComponent } from '@/components/default-error-component'
import { DataTable, SortButton } from '@/components/data-table'
import { QueriesLayout } from './-queries-layout'

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
      {queries.map((query) => (
        <div
          key={query.id}
          className="mono my-4 flex flex-col gap-2 whitespace-pre rounded-md bg-muted p-2 text-sm leading-tight text-muted-foreground"
        >
          {JSON.stringify(query, null, 2)}
        </div>
      ))}
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
    header: ({ column }) => <SortButton column={column}>Query ID</SortButton>,
  },
  {
    accessorKey: 'corpus.name',
    header: ({ column }) => <SortButton column={column}>Corpus</SortButton>,
  },
  {
    id: 'actions',
    header: '',
    cell: (cell) => {
      const queryId = cell.row.original.id
      if (queryId === undefined) {
        throw new Error('Query ID is undefined')
      }
      return <QueryPopover queryId={queryId.toString()} />
    },
  },
]

function QueryPopover({ queryId }: { queryId: string }) {
  const router = useRouter()
  const { mutate, isPending } = useMutation({
    ...deleteQueryMutationOptions,
    onSuccess: (...args) => {
      deleteQueryMutationOptions.onSuccess?.(...args)
      router.invalidate()
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
        <Button
          disabled={isPending}
          variant="destructive"
          className="w-full"
          onClick={() => mutate(queryId)}
          size="sm"
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <XSquare className="mr-2 h-4 w-4" />
          )}
          Delete
        </Button>
      </PopoverContent>
    </Popover>
  )
}

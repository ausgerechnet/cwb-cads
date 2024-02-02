import { useEffect, useMemo, useState } from 'react'
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
  useLoaderData,
  ErrorComponentProps,
  useNavigate,
} from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { AlertCircle } from 'lucide-react'

import { cn } from '@/lib/utils'
import { deleteQueryMutationOptions } from '@/lib/queries'
import { schemas } from '@/rest-client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Pagination } from '@/components/pagination'
import { Button, buttonVariants } from '@/components/ui/button'
import { Large } from '@/components/ui/typography'
import {
  ColumnDef,
  PaginationState,
  Table as TableType,
  Updater,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableHeader,
  TableCell,
  TableBody,
  TableHead,
  TableRow,
} from '@/components/ui/table'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { QueriesLayout } from './-queries-layout'

export const Route = createLazyFileRoute('/_app/queries')({
  component: Queries,
  errorComponent: QueriesError,
})

function Queries() {
  const { queries } = useLoaderData({ from: '/_app/queries', strict: true })
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
      <QueryTable queries={queries} />
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

function QueriesError({ error }: ErrorComponentProps) {
  const errorMessage =
    typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : 'Unknown error'
  return (
    <QueriesLayout>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>An error occurred while loading the queries.</AlertTitle>
        <AlertDescription className="whitespace-pre">
          {errorMessage}
        </AlertDescription>
      </Alert>
    </QueriesLayout>
  )
}

const columns: ColumnDef<z.infer<typeof schemas.QueryOut>>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
  },
  {
    accessorKey: 'corpus.name',
    header: 'Corpus',
  },
  {
    id: 'actions',
    header: '',
    cell: (cell) => {
      const queryId = cell.row.original.id
      if (queryId === undefined) {
        throw new Error('Query ID is undefined')
      }
      return (
        <div className="flex gap-1">
          <Link
            className={cn(
              buttonVariants({ variant: 'ghost' }),
              'align-center flex place-items-center gap-2 whitespace-nowrap',
            )}
            to="/queries/$queryId"
            params={{ queryId: String(queryId) }}
          >
            <Eye className="h-4 w-4" />
            View Details
          </Link>
          <QueryPopover queryId={queryId.toString()} />
        </div>
      )
    },
  },
]

function QueryPopover({ queryId }: { queryId: string }) {
  const { mutate, isPending } = useMutation(deleteQueryMutationOptions)
  return (
    <Popover>
      <PopoverTrigger
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
      >
        <MoreVertical className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-2 ">
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

function QueryTable({
  queries,
}: {
  queries: z.infer<typeof schemas.QueryOut>[]
}) {
  const tableOptions = useTableSearchPagination()
  const table = useReactTable({
    data: queries,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: true,
    ...tableOptions,
  })
  useTableOverflowPrevention(table)

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell, index, rows) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        (index === 0 || index === rows.length - 1) && 'w-0',
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination table={table} />
    </div>
  )
}

function useTableSearchPagination() {
  const navigate = useNavigate()
  const { pageIndex: initialPageIndex = 0, pageSize: initialPageSize = 5 } =
    Route.useSearch()
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: initialPageIndex,
    pageSize: initialPageSize,
  })

  return useMemo(() => {
    return {
      state: { pagination },
      onPaginationChange: (updater: Updater<PaginationState>) => {
        let newPagination: undefined | PaginationState
        if (typeof updater === 'function') {
          newPagination = updater(pagination)
        } else {
          newPagination = updater
        }
        navigate({
          replace: true,
          params: {},
          search: (search) => ({ ...search, ...newPagination }),
        })
        setPagination(newPagination)
      },
    }
  }, [navigate, pagination])
}

function useTableOverflowPrevention(
  table: Pick<TableType<unknown>, 'getPageCount' | 'getState' | 'setPageIndex'>,
) {
  const pageCount = table.getPageCount()
  const tablePageIndex = table.getState().pagination.pageIndex
  useEffect(() => {
    if (tablePageIndex >= pageCount) {
      table.setPageIndex(pageCount - 1)
    }
  }, [pageCount, table, tablePageIndex])
}

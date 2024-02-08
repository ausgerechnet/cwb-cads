import { useEffect, useMemo } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { ReactNode, useNavigate } from '@tanstack/react-router'
import {
  ColumnDef,
  SortingColumn,
  Table as TableType,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { z } from 'zod'

import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import { safeJsonParse } from '@/lib/safe-json-parse'

const DEFAULT_PAGE_SIZE = 10
const parsePagination = z
  .object({
    pageIndex: z.coerce.number().int().min(0).optional().default(0).catch(0),
    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .optional()
      .default(DEFAULT_PAGE_SIZE)
      .catch(DEFAULT_PAGE_SIZE),
  })
  .catch({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE }).parse

const parseSort = z
  .array(
    z.object({
      id: z.string(),
      desc: z.boolean(),
    }),
  )
  .catch([]).parse

export function DataTable<RowData>({
  rows,
  columns,
  className,
  onRowClick,
  pageIndexParamName = 'pageIndex',
  pageSizeParamName = 'pageSize',
  sortParamName = 'sort',
}: {
  rows: RowData[]
  columns: ColumnDef<RowData>[]
  className?: string
  onRowClick?: (row: RowData) => void
  pageIndexParamName?: string
  pageSizeParamName?: string
  sortParamName?: string
}) {
  const initialState = useMemo(() => {
    const searchParams = new URLSearchParams(location.search)
    const pagination = parsePagination({
      pageIndex: searchParams.get(pageIndexParamName),
      pageSize: searchParams.get(pageSizeParamName),
    })
    const sorting = parseSort(
      safeJsonParse(searchParams.get(sortParamName)).data ?? [],
    )
    return { pagination, sorting }
  }, [pageIndexParamName, pageSizeParamName, sortParamName])
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    autoResetPageIndex: false,
    initialState,
  })
  const sorting = table.getState().sorting
  const { pageIndex, pageSize } = table.getState().pagination
  const navigate = useNavigate()
  useEffect(() => {
    navigate({
      replace: true,
      params: (p) => p,
      search: (search) => ({
        ...search,
        [pageIndexParamName]: pageIndex,
        [pageSizeParamName]: pageSize,
        [sortParamName]: sorting,
      }),
    })
  }, [
    navigate,
    pageIndex,
    pageIndexParamName,
    pageSize,
    pageSizeParamName,
    sortParamName,
    sorting,
  ])
  useTableOverflowPrevention(table)

  return (
    <div className={cn('flex flex-col gap-4', className)}>
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
                  onClick={() => {
                    onRowClick?.(row.original)
                  }}
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

export function SortButton<T>({
  column,
  children,
}: {
  children: ReactNode
  column: SortingColumn<T>
}) {
  return (
    <Button
      className="-m-3"
      onClick={() => column.toggleSorting()}
      variant="ghost"
      size="sm"
    >
      {children}
      {column.getIsSorted() === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
      {column.getIsSorted() === 'desc' && (
        <ArrowDown className="ml-2 h-4 w-4" />
      )}
      {column.getIsSorted() === false && (
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Button>
  )
}

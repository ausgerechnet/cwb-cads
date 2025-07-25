'use no memo'
import { ReactNode, useEffect, useMemo } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Link, useNavigate, type LinkProps } from '@tanstack/react-router'
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

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'
import { Button, buttonVariants } from './ui/button'
import { PaginationForTable } from './pagination'
import { safeJsonParse } from '../lib/safe-json-parse'
import { cn } from '../lib/utils'

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
    // eslint-disable-next-line
    // @ts-ignore
    initialState,
  })
  const sorting = table.getState().sorting
  const { pageIndex, pageSize } = table.getState().pagination
  const navigate = useNavigate()
  useEffect(() => {
    void navigate({
      replace: true,
      // eslint-disable-next-line
      // @ts-ignore
      params: (p) => p,
      // eslint-disable-next-line
      // @ts-ignore
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
                  className={onRowClick ? 'cursor-pointer' : ''}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        pick(cell.column.columnDef.meta, 'className') as
                          | undefined
                          | string
                      }
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

      <PaginationForTable table={table} />
    </div>
  )
}

function pick(obj: unknown, key: string) {
  if (typeof obj === 'object' && obj !== null) {
    return (obj as Record<string, unknown>)[key]
  }
  return undefined
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
  children,
  column,
}: {
  children: ReactNode
  column: SortingColumn<T>
}) {
  return (
    <SortButtonView
      isSorted={column.getIsSorted()}
      onClick={() => column.toggleSorting()}
    >
      {children}
    </SortButtonView>
  )
}

export function SortButtonView({
  onClick,
  children,
  className,
  isSorted = false,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  /**
   * Indicates the sorting state of the column.
   * - `false`: not sorted
   * - `'asc'`: sorted in ascending order
   * - `'desc'`: sorted in descending order
   * - `'hide'`: not sorted and icon is hidden
   */
  isSorted?: false | 'asc' | 'desc' | 'hide'
}) {
  return (
    <Button
      className={cn('-m-3', className)}
      onClick={onClick}
      variant="ghost"
      size="sm"
    >
      {children}
      {isSorted === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
      {isSorted === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
      {isSorted === false && (
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Button>
  )
}

export function SortButtonLink<T>({
  className,
  children,
  isSorted = false,
  ...props
}: Omit<LinkProps<T>, 'children'> & {
  /**
   * Indicates the sorting state of the column.
   * - `false`: not sorted
   * - `'asc'`: sorted in ascending order
   * - `'desc'`: sorted in descending order
   * - `'hide'`: not sorted and icon is hidden
   */
  isSorted?: false | 'asc' | 'desc' | 'hide'
  className?: string
  children: ReactNode
}) {
  return (
    <Link
      to={props.to}
      from={props.from}
      replace={props.replace}
      params={props.params}
      search={props.search}
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'sm' }),
        '-m-3',
        className,
      )}
    >
      {children}
      {isSorted === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
      {isSorted === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
      {isSorted === false && (
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Link>
  )
}

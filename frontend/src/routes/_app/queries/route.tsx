import { AlertCircle, Eye, Plus } from 'lucide-react'
import {
  ErrorComponentProps,
  Link,
  ReactNode,
  createFileRoute,
} from '@tanstack/react-router'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { z } from 'zod'

import { cn } from '@/lib/utils'
import { queriesQueryOptions } from '@/lib/queries'
import { schemas } from '@/rest-client'
import { buttonVariants } from '@/components/ui/button'
import { Large } from '@/components/ui/typography'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { AppPageFrame } from '@/components/app-page-frame'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export const Route = createFileRoute('/_app/queries')({
  component: Queries,
  errorComponent: QueriesError,
  loader: async ({ context: { queryClient } }) => ({
    queries: await queryClient.ensureQueryData(queriesQueryOptions),
  }),
})

function Queries() {
  const { queries } = Route.useLoaderData()
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
    header: 'Select',
    cell: (cell) => {
      const queryId = cell.row.original.id
      if (queryId === undefined) {
        throw new Error('Query ID is undefined')
      }
      return (
        <Link to="/queries/$queryId" params={{ queryId: String(queryId) }}>
          <Eye className="h-4 w-4" />
        </Link>
      )
    },
  },
]

export default function QueriesPending() {
  return (
    <QueriesLayout>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    </QueriesLayout>
  )
}

function QueriesLayout({ children }: { children: ReactNode }) {
  return (
    <AppPageFrame
      title="Queries"
      cta={{
        to: '/queries/new',
        label: 'New Query',
      }}
    >
      {children}
    </AppPageFrame>
  )
}

function QueryTable({
  queries,
}: {
  queries: z.infer<typeof schemas.QueryOut>[]
}) {
  const table = useReactTable({
    data: queries,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })
  return (
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
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

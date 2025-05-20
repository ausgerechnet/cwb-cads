import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@cads/shared/components/ui/table'
import { createFileRoute } from '@tanstack/react-router'
import { Block, BlockComment } from './-block'
import { DataTable, SortButton } from '@cads/shared/components/data-table'
import { Pagination } from '@cads/shared/components/pagination'

export const Route = createFileRoute('/components_/table')({
  component: TableComponents,
})

function TableComponents() {
  return (
    <>
      <Block componentTag="Table">
        <BlockComment>Basic building blocks for tables.</BlockComment>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header 1</TableHead>
              <TableHead>Header 2</TableHead>
              <TableHead>Header 3</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            <TableRow>
              <TableCell>Row 1, Cell 1</TableCell>
              <TableCell>Row 1, Cell 2</TableCell>
              <TableCell>Row 1, Cell 3</TableCell>
            </TableRow>

            <TableRow>
              <TableCell>Row 2, Cell 1</TableCell>
              <TableCell>Row 2, Cell 2</TableCell>
              <TableCell>Row 2, Cell 3</TableCell>
            </TableRow>

            <TableRow>
              <TableCell>Row 3, Cell 1</TableCell>
              <TableCell>Row 3, Cell 2</TableCell>
              <TableCell>Row 3, Cell 3</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Block>

      <Block componentTag="Pagination">
        <BlockComment>
          A simple pagination component that can be used with the DataTable.
          <br />
          There is a variant to use with DataTable:
          <code>&lt;PaginationForTable&gt;</code>
        </BlockComment>

        <Pagination
          pageIndex={0}
          pageSize={10}
          pageCount={100}
          totalRows={1000}
          setPageSize={() => {}}
          setPageIndex={() => {}}
        />
      </Block>

      <Block componentTag="DataTable">
        <BlockComment>
          A wrapper around the basic table components to provide an easier and
          consistent way to render data tables. It uses the
          @tanstack/react-table library under the hood.
        </BlockComment>

        <DataTable
          columns={[
            {
              accessorKey: 'name',
              enableSorting: true,
              header: ({ column }) => (
                <SortButton column={column}>Name</SortButton>
              ),
            },
            { accessorKey: 'value', header: 'Value' },
          ]}
          rows={[
            { id: 1, name: 'Row 1, Cell 1', value: 'Row 1, Cell 2' },
            { id: 2, name: 'Row 2, Cell 1', value: 'Row 2, Cell 2' },
            { id: 3, name: 'Row 3, Cell 1', value: 'Row 3, Cell 2' },
            /* and so on... */
            ...Array.from({ length: 100 }, (_, i) => ({
              id: i + 4,
              name: `Row ${i + 4}, Cell 1`,
              value: `Row ${i + 4}, Cell 2`,
            })),
          ]}
        />
      </Block>
    </>
  )
}

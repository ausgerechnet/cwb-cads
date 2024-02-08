import { type Table } from '@tanstack/table-core'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { Small } from '@/components/ui/typography'

export function Pagination<T>({ table }: { table: Table<T> }) {
  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = table.getPageCount()
  const pages = getPages(pageIndex, pageCount)
  const totalRows = table.getCoreRowModel().rows.length

  return (
    <div className="grid grid-cols-[1fr_auto_1fr]">
      <Small className="my-auto">{totalRows} entries</Small>
      <div className="col-start-2 flex place-items-center gap-2">
        <Button
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
          variant="ghost"
        >
          <ChevronLeft className="mr-auto h-4 w-4" />
        </Button>
        {pages.map(({ pageIndex, isCurrent, isEllipsis }, i) => {
          if (isEllipsis) {
            return (
              <div
                key={i}
                className={cn(
                  buttonVariants({ variant: 'ghost' }),
                  'pointer-events-none min-w-8 px-2 text-muted-foreground',
                )}
              >
                <MoreHorizontal className="mx-auto h-4 w-4 flex-grow" />
              </div>
            )
          }
          if (isCurrent) {
            return (
              <div
                key={i}
                className={cn(
                  buttonVariants({ variant: 'ghost' }),
                  'pointer-events-none min-w-8 rounded-md border border-gray-300 px-2',
                )}
              >
                {pageIndex + 1}
              </div>
            )
          }
          return (
            <Button
              key={i}
              onClick={() => table.setPageIndex(pageIndex)}
              variant="ghost"
              className="min-w-8 border border-transparent px-2"
            >
              {pageIndex + 1}
            </Button>
          )
        })}
        <Button
          disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
          variant="ghost"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="ml-auto flex w-min place-content-center place-items-center gap-3 self-end whitespace-pre">
        <Small>Items per Page</Small>
        <Select
          value={pageSize.toString()}
          onValueChange={(newValue) => table.setPageSize(parseInt(newValue))}
        >
          <SelectTrigger>{pageSize}</SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

type PaginationPage =
  | { pageIndex: number; isCurrent: boolean; isEllipsis: false }
  | { pageIndex: null; isCurrent: false; isEllipsis: true }

function getPages(index: number, pageCount: number, rowSize = 7) {
  if (pageCount <= rowSize) {
    return Array.from({ length: pageCount }, (_, i) => ({
      pageIndex: i,
      isCurrent: i === index,
      isEllipsis: false,
    }))
  }
  const pages: PaginationPage[] = []
  const first = Math.max(0, index - Math.floor(rowSize / 2))
  const last = Math.min(pageCount - 1, first + rowSize - 1)

  for (let i = first; i <= last; i++) {
    pages.push({
      pageIndex: i,
      isCurrent: i === index,
      isEllipsis: false,
    })
  }

  while (pages.length < rowSize && pages.at(0)?.pageIndex !== 0) {
    const pageIndex = (pages[0]?.pageIndex ?? 1) - 1
    pages.unshift({
      pageIndex,
      isCurrent: pageIndex === index,
      isEllipsis: false,
    })
  }

  if (pages[0].pageIndex !== 0) {
    pages[0].pageIndex = 0
    if (pages[1]) {
      pages[1] = {
        pageIndex: null,
        isCurrent: false,
        isEllipsis: true,
      }
    }
  }

  if (pages.length > 1 && pages.at(-1)?.pageIndex !== pageCount - 1) {
    pages.at(-1)!.pageIndex = pageCount - 1
    if (pages.length > 4) {
      pages[pages.length - 2] = {
        pageIndex: null,
        isCurrent: false,
        isEllipsis: true,
      }
    }
  }

  return pages
}

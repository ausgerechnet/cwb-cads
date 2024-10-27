import { type Table } from '@tanstack/table-core'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'

import { cn } from '@cads/shared/lib/utils'
import { Button, buttonVariants } from '@cads/shared/components/ui/button'
import { Select } from '@cads/shared/components/ui/select'
import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from '@cads/shared/components/ui/select'
import { Small } from '@cads/shared/components/ui/typography'
import { formatNumber } from '@cads/shared/lib/format-number'

export function PaginationForTable<T>({ table }: { table: Table<T> }) {
  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = table.getPageCount()
  const totalRows = table.getCoreRowModel().rows.length

  return (
    <Pagination
      totalRows={totalRows}
      setPageIndex={(index) => table.setPageIndex(index)}
      setPageSize={(size) => table.setPageSize(size)}
      pageIndex={pageIndex}
      pageCount={pageCount}
      pageSize={pageSize}
    />
  )
}

export function Pagination({
  totalRows,
  setPageIndex,
  setPageSize,
  pageIndex,
  pageCount,
  pageSize,
  className,
}: {
  totalRows: number
  setPageIndex: (index: number) => void
  setPageSize: (size: number) => void
  pageIndex: number
  pageCount: number
  pageSize: number
  className?: string
}) {
  const canPrevious = pageIndex > 0
  const canNext = pageIndex < pageCount - 1
  const pages = getPages(pageIndex, pageCount, 9)
  const onPreviousClick = () => setPageIndex(Math.max(pageIndex - 1, 0))
  const onNextClick = () => setPageIndex(Math.min(pageIndex + 1, pageCount - 1))

  return (
    <div
      className={cn(
        'bg-background/50 sticky bottom-0 mx-[1px] grid grid-cols-[1fr_auto_1fr] px-2 py-2 backdrop-blur-lg',
        className,
      )}
    >
      <Small className="my-auto">
        {totalRows ? formatNumber(totalRows) : 'no'}{' '}
        {totalRows === 1 ? 'entry' : 'entries'}
      </Small>
      <div className="col-start-2 flex place-items-center gap-2">
        {totalRows > 0 && (
          <Button
            disabled={!canPrevious}
            onClick={onPreviousClick}
            variant="ghost"
          >
            <ChevronLeft className="mr-auto h-4 w-4" />
          </Button>
        )}
        {pages.map(({ pageIndex, isCurrent, isEllipsis }, i) => {
          if (isEllipsis) {
            return (
              <div
                key={i}
                className={cn(
                  buttonVariants({ variant: 'ghost' }),
                  'text-muted-foreground pointer-events-none min-w-8 px-2 font-mono',
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
                  'pointer-events-none min-w-8 rounded-md border border-gray-300 px-2 font-mono',
                )}
              >
                {pageIndex + 1}
              </div>
            )
          }
          return (
            <Button
              key={i}
              onClick={() => setPageIndex(pageIndex)}
              variant="ghost"
              className="min-w-8 border border-transparent px-2 font-mono"
            >
              {pageIndex + 1}
            </Button>
          )
        })}
        {totalRows > 0 && (
          <Button disabled={!canNext} onClick={onNextClick} variant="ghost">
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="ml-auto flex w-min place-content-center place-items-center gap-3 self-end whitespace-pre">
        <Small>Items per Page</Small>
        <Select
          value={pageSize.toString()}
          onValueChange={(newValue) => setPageSize(parseInt(newValue))}
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

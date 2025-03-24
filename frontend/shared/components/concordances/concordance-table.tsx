import { z } from 'zod'

import { schemas } from '../../api-client'
import { Repeat } from '../repeat'
import { Skeleton } from '../ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { cn } from '../../lib/utils'
import { ConcordanceLineRender } from './concordance-line'
import {
  ConcordanceProvider,
  type ConcordanceContextValue,
} from './concordance-context'

export function ConcordanceTable({
  concordanceLines,
  className,
  isLoading,
  rowCount = 5,
  fetchContext,
  onItemClick,
}: {
  concordanceLines?: z.infer<typeof schemas.ConcordanceLineOut>[]
  className?: string
  isLoading: boolean
  rowCount?: number
  onItemClick: (word: { primary: string; secondary: string }) => void
  fetchContext: ConcordanceContextValue['fetchContext']
}) {
  return (
    <ConcordanceProvider value={{ onItemClick, fetchContext }}>
      <Table
        isNarrow
        className={cn(
          'grid w-full grid-cols-[min-content_1fr_max-content_1fr_min-content] overflow-hidden',
          className,
        )}
      >
        <TableHeader className="col-span-full grid grid-cols-subgrid">
          <TableRow className="col-span-full grid grid-cols-subgrid">
            <TableHead className="flex items-center">ID</TableHead>
            <TableHead className="flex items-center justify-end">
              Context
            </TableHead>
            <TableHead className="flex items-center justify-center">
              Keyword
            </TableHead>
            <TableHead className="flex items-center">Context</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody className="col-span-full grid grid-cols-subgrid">
          {!isLoading &&
            (concordanceLines ?? []).map((line) => (
              <ConcordanceLineRender
                key={line.match_id}
                concordanceLine={line}
              />
            ))}
          {isLoading && (
            <Repeat count={rowCount}>
              <TableRow className="col-span-full grid grid-cols-subgrid">
                <TableCell className="col-span-full">
                  <Skeleton className="h-5" />
                </TableCell>
              </TableRow>
            </Repeat>
          )}
        </TableBody>
      </Table>
    </ConcordanceProvider>
  )
}

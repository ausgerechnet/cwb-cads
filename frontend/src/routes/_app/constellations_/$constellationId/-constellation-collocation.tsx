import { cn } from '@/lib/utils.ts'
import { ErrorMessage } from '@/components/error-message.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Pagination } from '@/components/pagination.tsx'
import { Repeat } from '@/components/repeat.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { useFilterSelection } from '@/routes/_app/constellations_/$constellationId/-use-filter-selection.ts'
import { useCollocation } from '@/routes/_app/constellations_/$constellationId/-use-collocation.ts'

const measureOrder = [
  'conservative_log_ratio',
  'O11',
  'E11',
  'ipm',
  'log_likelihood',
  'z_score',
  't_score',
  'simple_ll',
  'dice',
  'log_ratio',
  'min_sensitivity',
  'liddell',
  'mutual_information',
  'local_mutual_information',
] as const

const measureMap: Record<(typeof measureOrder)[number], string> = {
  conservative_log_ratio: 'Cons. Log Ratio',
  O11: 'O11',
  E11: 'E11',
  ipm: 'ipm',
  log_likelihood: 'Log Likelihood',
  z_score: 'Z Score',
  t_score: 'T Score',
  simple_ll: 'Simple LL',
  dice: 'dice',
  log_ratio: 'Log Ratio',
  min_sensitivity: 'Min Sensitivity',
  liddell: 'Liddell',
  mutual_information: 'Mutual Info.',
  local_mutual_information: 'Local Mutual Info.',
}

export function Collocation({
  constellationId,
  descriptionId,
  corpusId,
}: {
  constellationId: number
  corpusId?: number
  descriptionId?: number
}) {
  const { setFilter, ccPageSize, ccPageNumber } = useFilterSelection(
    '/_app/constellations/$constellationId',
    corpusId,
  )
  const { error, isLoading, collocationItems } = useCollocation(
    constellationId,
    descriptionId,
    corpusId,
  )
  return (
    <div>
      <ErrorMessage error={error} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            {measureOrder.map((measure) => (
              <TableHead key={measure}>{measureMap[measure]}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <Repeat count={ccPageSize}>
              <TableRow>
                <TableCell colSpan={measureOrder.length + 1} className="py-1">
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              </TableRow>
            </Repeat>
          )}
          {(collocationItems?.items ?? []).map(({ item, scores = [] }) => (
            <TableRow
              key={item}
              className={cn(isLoading && 'animate-pulse', 'py-0')}
            >
              <TableCell className="py-1">
                <Button
                  onClick={() => {
                    setFilter('ccFilterItem', item)
                    setFilter('clFilterItem', item)
                  }}
                  variant="secondary"
                  size="sm"
                >
                  {item}
                </Button>
              </TableCell>
              {measureOrder.map((measure) => (
                <TableCell key={measure} className="py-1">
                  {scores.find((s) => s.measure === measure)?.score ?? 'N/A'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        totalRows={collocationItems?.nr_items ?? 0}
        setPageSize={(size) => setFilter('ccPageSize', size)}
        setPageIndex={(index) => setFilter('ccPageNumber', index + 1)}
        pageIndex={(ccPageNumber ?? 1) - 1}
        pageCount={collocationItems?.page_count ?? 0}
        pageSize={ccPageSize}
      />
    </div>
  )
}

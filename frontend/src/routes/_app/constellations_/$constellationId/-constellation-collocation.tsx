import { useQuery } from '@tanstack/react-query'

import {
  constellationCollocation,
  collocationItemsById,
} from '@/lib/queries.ts'
import { cn } from '@/lib/utils.ts'
import { ErrorMessage } from '@/components/error-message.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Pagination } from '@/components/pagination.tsx'
import { Repeat } from '@/components/repeat.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { useFilterSelection } from '@/routes/_app/constellations_/$constellationId/-use-filter-selection.ts'

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

export function Collocation({
  constellationId,
  descriptionId,
  corpusId,
}: {
  constellationId: number
  corpusId?: number
  descriptionId?: number
}) {
  const {
    setFilter,
    filterItem,
    secondary,
    s,
    windowSize,
    focusDiscourseme,
    ccPageSize,
    ccSortBy,
    ccSortOrder,
    ccPageNumber,
  } = useFilterSelection('/_app/constellations/$constellationId', corpusId)
  const {
    data: collocation,
    isLoading: isLoadingConstellation,
    error,
  } = useQuery({
    ...constellationCollocation(constellationId, descriptionId!, {
      focusDiscoursemeId: focusDiscourseme!,
      filterItem: filterItem!,
      filterItemPAttribute: secondary!,
      p: secondary!,
      sBreak: s!,
      window: windowSize,
    }),
    // keep previous data
    placeholderData: (p) => p,
    enabled:
      focusDiscourseme !== undefined &&
      descriptionId !== undefined &&
      s !== undefined &&
      secondary !== undefined &&
      filterItem !== undefined,
  })
  const {
    data: collocationItems,
    isLoading: isLoadingItems,
    error: errorConstellation,
  } = useQuery({
    ...collocationItemsById(collocation?.id as number, {
      sortBy: ccSortBy,
      sortOrder: ccSortOrder,
      pageSize: ccPageSize,
      pageNumber: ccPageNumber,
    }),
    enabled: collocation?.id !== undefined,
  })
  const isLoading = isLoadingItems || isLoadingConstellation

  return (
    <div>
      <ErrorMessage error={error} />
      <ErrorMessage error={errorConstellation} />
      <Table>
        <TableHeader>
          <TableCell>Item</TableCell>
          {measureOrder.map((measure) => (
            <TableCell key={measure}>{measure}</TableCell>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading && (
            <Repeat count={ccPageSize}>
              <TableRow>
                <TableCell colSpan={measureOrder.length + 1}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              </TableRow>
            </Repeat>
          )}
          {(collocationItems?.items ?? []).map(({ item, scores = [] }) => (
            <TableRow key={item} className={cn(isLoading && 'animate-pulse')}>
              <TableCell>
                <Button onClick={() => setFilter('filterItem', item)}>
                  {item}
                </Button>
              </TableCell>
              {measureOrder.map((measure) => (
                <TableCell key={measure}>
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

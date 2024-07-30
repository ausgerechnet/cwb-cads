import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'

import { queryConstellationCollocationOptions } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { ErrorMessage } from '@/components/error-message'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/pagination'
import { Repeat } from '@/components/repeat'
import { Skeleton } from '@/components/ui/skeleton'

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

export function Collocation({ constellationId }: { constellationId: number }) {
  const searchParams = useSearch({
    from: '/_app/constellations/$constellationId',
  })
  const {
    windowSize = 3,
    corpusId,
    ccSortBy,
    ccPageSize = 5,
    ccPageNumber,
    ccSortOrder,
    filterItemPAtt,
    semanticBreak,
    semanticMapId,
    subcorpusId,
  } = searchParams
  const { data, isLoading, error } = useQuery({
    ...queryConstellationCollocationOptions(
      constellationId,
      // This component only renders if corpusId exists
      corpusId as number,
      {
        // @ts-expect-error - pAtt is not optional, but `enabled` mitigates this
        p: filterItemPAtt,
        window: windowSize,
        semanticMapId,
        subcorpusId,
        semanticBreak,
        sortOrder: ccSortOrder,
        sortBy: ccSortBy,
        pageSize: ccPageSize,
        pageNumber: ccPageNumber,
      },
    ),
    // keep previous data
    placeholderData: (p) => p,
    enabled: Boolean(filterItemPAtt),
  })
  const navigate = useNavigate()
  const setSearch = useCallback(
    (key: string, value?: string | number | boolean) => {
      console.log(key, value)
      navigate({
        search: (s) => ({ ...s, [key]: value }),
        params: (p) => p,
        replace: true,
      })
    },
    [navigate],
  )

  return (
    <div>
      <ErrorMessage error={error} />
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
          {(data?.items ?? []).map(({ item, scores = [] }) => (
            <TableRow key={item} className={cn(isLoading && 'animate-pulse')}>
              <TableCell>
                <Button onClick={() => setSearch('filterItem', item)}>
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
        totalRows={data?.nr_items ?? 0}
        setPageSize={(size) => setSearch('ccPageSize', size)}
        setPageIndex={(index) => setSearch('ccPageNumber', index)}
        pageIndex={ccPageNumber ?? 0}
        pageCount={data?.page_count ?? 0}
        pageSize={ccPageSize}
      />
    </div>
  )
}

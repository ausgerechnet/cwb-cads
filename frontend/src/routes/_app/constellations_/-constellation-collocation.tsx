import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'

import { constellationCollocation, collocationItemsById } from '@/lib/queries'
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
import { useFilterSelection } from '@/routes/_app/constellations_/-use-filter-selection.ts'

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
}: {
  constellationId: number
  descriptionId?: number
}) {
  const searchParams = useSearch({
    from: '/_app/constellations/$constellationId',
  })
  const {
    // windowSize,
    // subcorpusId,
    // secondary: filterItemPAtt,
    setFilter,
    focusDiscourseme,
  } = useFilterSelection('/_app/constellations/$constellationId')
  const {
    ccSortBy,
    ccPageSize = 5,
    ccPageNumber,
    ccSortOrder,
    // semanticBreak,
    // semanticMapId,
  } = searchParams
  const {
    data: collocation,
    isLoading: isLoadingConstellation,
    error,
  } = useQuery({
    ...constellationCollocation(constellationId, descriptionId!, {
      focusDiscoursemeId: focusDiscourseme!,
      filterItem: '',
      filterItemPAttribute: '',
      p: 'lemma',
      sBreak: 's',
      window: 3,
    }),
    // keep previous data
    placeholderData: (p) => p,
    enabled: focusDiscourseme !== undefined && descriptionId !== undefined,
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
  const navigate = useNavigate()
  const setSearch = useCallback(
    (key: string, value?: string | number | boolean) => {
      void navigate({
        search: (s) => ({ ...s, [key]: value }),
        params: (p) => p,
        replace: true,
      })
    },
    [navigate],
  )

  console.log('> collocation', collocation)
  console.log('> items', collocationItems)
  console.log('> ids', constellationId, descriptionId, collocation?.id)

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
        setPageSize={(size) => setSearch('ccPageSize', size)}
        setPageIndex={(index) => setSearch('ccPageNumber', index)}
        pageIndex={ccPageNumber ?? 0}
        pageCount={collocationItems?.page_count ?? 0}
        pageSize={ccPageSize}
      />
    </div>
  )
}

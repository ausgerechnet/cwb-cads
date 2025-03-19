import { ArrowDownIcon, ArrowUpIcon, CheckIcon } from 'lucide-react'
import { getCollocationItems, queryCollocation } from '@cads/shared/queries'
import { useQuery } from '@tanstack/react-query'
import { ErrorMessage } from '@cads/shared/components/error-message'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@cads/shared/components/ui/table'
import { Link } from '@tanstack/react-router'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { cn } from '@cads/shared/lib/utils'
import { Pagination } from '@cads/shared/components/pagination'
import { Repeat } from '@cads/shared/components/repeat'
import { Skeleton } from '@cads/shared/components/ui/skeleton'

import { Route } from './route'
import { useFilterSelection } from '../../constellations_/$constellationId/-use-filter-selection'

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

export function QueryCollocation() {
  const queryId = parseInt(Route.useParams().queryId)
  const {
    setFilter,
    ccPageSize,
    ccPageNumber = 1,
    clFilterItem,
    ccSortOrder,
    ccSortBy,
    secondary = 'lemma',
    windowSize,
  } = useFilterSelection('/_app/queries_/$queryId')
  const {
    // secondary = 'lemma',
    contextBreak = 's',
    filterItem,
    filterItemPAtt,
  } = Route.useSearch()
  const {
    data: collocation,
    error: errorCollocation,
    isLoading: isLoadingCollocation,
  } = useQuery({
    ...queryCollocation(queryId, secondary!, {
      semanticBreak: contextBreak,
      filterItem,
      filterItemPAtt,
      window: windowSize,
    }),
    enabled: Boolean(secondary),
    retry: 1,
  })
  const collocationId = collocation?.id
  const {
    data: collocationItems,
    isLoading: isLoadingItems,
    error: errorItems,
  } = useQuery({
    ...getCollocationItems(collocationId as number, {
      sortOrder: ccSortOrder,
      sortBy: ccSortBy,
      pageSize: ccPageSize,
      pageNumber: ccPageNumber,
    }),
    enabled: Boolean(collocationId),
  })
  const isLoading = isLoadingCollocation || isLoadingItems

  return (
    <div>
      <div className="bg-destructive text-destructive-foreground mb-4 rounded-md p-2">
        TODO: Properly wire up filter UI
      </div>
      <ErrorMessage error={[errorCollocation, errorItems]} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            {measureOrder.map((measure) => {
              const isCurrent = ccSortBy === measure
              return (
                <TableHead key={measure} className="text-right">
                  <Link
                    className={cn(
                      buttonVariants({ variant: 'ghost' }),
                      '-mx-2 inline-flex h-auto gap-1 px-2 leading-none',
                    )}
                    to=""
                    params={(p) => p}
                    search={(s) => {
                      if (isCurrent) {
                        return {
                          ...s,
                          ccSortOrder:
                            ccSortOrder === 'descending'
                              ? 'ascending'
                              : 'descending',
                        }
                      }
                      return {
                        ...s,
                        ccSortBy: measure,
                        ccSortOrder: 'ascending',
                      }
                    }}
                  >
                    {isCurrent && ccSortOrder === 'ascending' && (
                      <ArrowDownIcon className="h-3 w-3" />
                    )}
                    {isCurrent && ccSortOrder === 'descending' && (
                      <ArrowUpIcon className="h-3 w-3" />
                    )}
                    {measureMap[measure]}
                  </Link>
                </TableHead>
              )
            })}
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
          {!isLoading &&
            (collocationItems?.items ?? []).map(({ item, scores = [] }) => (
              <TableRow
                key={item}
                className={cn(isLoading && 'animate-pulse', 'py-0')}
              >
                <TableCell className="py-1">
                  <Link
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'inline-flex h-auto gap-1 px-2 py-1 leading-none',
                    )}
                    to=""
                    params={(p) => p}
                    search={(s) => ({
                      ...s,
                      clPageIndex: 0,
                      clFilterItem: item,
                      clFilterItemPAtt: secondary,
                    })}
                  >
                    {item}
                    {item === clFilterItem && <CheckIcon className="h-3 w-3" />}
                  </Link>
                </TableCell>
                {measureOrder.map((measure) => (
                  <TableCell
                    key={measure}
                    className="py-1 text-right font-mono"
                  >
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
        pageIndex={ccPageNumber - 1}
        pageCount={collocationItems?.page_count ?? 0}
        pageSize={ccPageSize}
      />
    </div>
  )
}

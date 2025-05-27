import { ArrowDownIcon, ArrowUpIcon, CheckIcon } from 'lucide-react'
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
import {
  MeasureSelect,
  useMeasureSelection,
} from '@cads/shared/components/measures'

import { useFilterSelection } from '../../constellations_/$constellationId/-use-filter-selection'
import { useCollocation } from './-use-collocation'

export function QueryCollocation() {
  const {
    ccSortBy = 'conservative_log_ratio',
    ccPageNumber = 1,
    ccPageSize = 10,
    ccSortOrder = 'descending',
    clFilterItem,
    secondary = 'lemma',
    setFilter,
  } = useFilterSelection('/_app/queries_/$queryId')
  const { selectedMeasures, measureNameMap } = useMeasureSelection()
  const { collocationItems, isLoading, errors } = useCollocation()

  return (
    <div>
      <div className="bg-destructive text-destructive-foreground mb-4 rounded-md p-2">
        TODO: Properly wire up filter UI
      </div>

      <ErrorMessage error={errors} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="flex items-center">
              <MeasureSelect />
              <span className="my-auto">Item</span>
            </TableHead>

            {selectedMeasures.map((measure) => {
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

                    {measureNameMap.get(measure)}
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
                <TableCell
                  colSpan={selectedMeasures.length + 1}
                  className="py-1"
                >
                  <Skeleton className="h-6 w-full" />
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

                {selectedMeasures.map((measure) => (
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

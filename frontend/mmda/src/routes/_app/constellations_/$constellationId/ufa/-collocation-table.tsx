import { useEffect } from 'react'
import { CheckIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { cn } from '@cads/shared/lib/utils'

import { ErrorMessage } from '@cads/shared/components/error-message'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@cads/shared/components/ui/table'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { Pagination } from '@cads/shared/components/pagination'
import { Repeat } from '@cads/shared/components/repeat'
import { Skeleton } from '@cads/shared/components/ui/skeleton'
import {
  useMeasureSelection,
  MeasureSelect,
} from '@cads/shared/components/measures'
import { SortButtonLink } from '@cads/shared/components/data-table'
import { Card } from '@cads/shared/components/ui/card'

import { useFilterSelection } from '../-use-filter-selection'
import { useUfa } from './-use-ufa'
import { useUfaSelection } from './-use-ufa-selection'

export function UfaCollocationTable() {
  const {
    setFilter,
    clFilterItem,
    ccPageSize,
    ccSortBy,
    ccSortOrder,
    ccPageNumber,
  } = useFilterSelection('/_app/constellations_/$constellationId')
  const { selectedMeasures, measureNameMap } = useMeasureSelection()
  const { analysisLayer } = useUfaSelection()
  const { collocationItems, isLoading, errors } = useUfa()

  const maxPageNumber = isLoading
    ? ccPageNumber
    : collocationItems?.page_count || 1

  useEffect(() => {
    if (
      ccPageNumber !== undefined &&
      maxPageNumber !== undefined &&
      ccPageNumber > maxPageNumber
    ) {
      setFilter('ccPageNumber', maxPageNumber)
    }
  }, [ccPageNumber, maxPageNumber, setFilter])
  const pageNumber = Math.min(ccPageNumber ?? 1, maxPageNumber ?? 1)

  return (
    <div>
      <ErrorMessage error={errors} />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="flex items-center">
                <MeasureSelect />
                <span className="my-auto">Item</span>
              </TableHead>

              {selectedMeasures.map((measure) => {
                const isCurrent = ccSortBy === measure
                const isSorted = isCurrent
                  ? ccSortOrder === 'ascending'
                    ? 'asc'
                    : 'desc'
                  : 'hide'
                return (
                  <TableHead key={measure} className="text-right">
                    {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment*/}
                    {/* @ts-ignore */}
                    <SortButtonLink
                      isSorted={isSorted}
                      replace
                      to="."
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
                      {measureNameMap.get(measure)}
                    </SortButtonLink>
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
                      to="."
                      replace
                      params={(p) => p}
                      search={(s) => ({
                        ...s,
                        clPageIndex: 0,
                        clFilterItem: item,
                        clFilterItemPAtt: analysisLayer,
                      })}
                    >
                      {item}
                      {item === clFilterItem && (
                        <CheckIcon className="h-3 w-3" />
                      )}
                    </Link>
                  </TableCell>

                  {selectedMeasures.map((measure) => (
                    <TableCell
                      key={measure}
                      className="py-1 text-right font-mono"
                    >
                      {scores.find((s) => s.measure === measure)?.score ??
                        'N/A'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

      <Pagination
        totalRows={collocationItems?.nr_items ?? 0}
        setPageSize={(size) => setFilter('ccPageSize', size)}
        setPageIndex={(index) => setFilter('ccPageNumber', index + 1)}
        pageIndex={pageNumber - 1}
        pageCount={collocationItems?.page_count ?? 0}
        pageSize={ccPageSize}
      />
    </div>
  )
}

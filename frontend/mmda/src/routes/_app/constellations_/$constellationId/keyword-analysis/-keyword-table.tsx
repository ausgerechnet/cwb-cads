import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CheckIcon } from 'lucide-react'

import { constellationKeywordAnalysisItems } from '@cads/shared/queries'
import { Pagination } from '@cads/shared/components/pagination'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { cn } from '@cads/shared/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@cads/shared/components/ui/table'
import { Skeleton } from '@cads/shared/components/ui/skeleton'
import { Repeat } from '@cads/shared/components/repeat'
import {
  MeasureSelect,
  useMeasureSelection,
} from '@cads/shared/components/measures'
import { useFilterSelection } from '@/routes/_app/constellations_/$constellationId/-use-filter-selection'
import { SortButtonLink } from '@cads/shared/components/data-table'
import { Card } from '@cads/shared/components/ui/card'

import { useDescription } from '../-use-description'
import { useKeywordSelection } from './-use-keyword-selection'
import { useKeywordAnalysis } from './-use-keyword-analysis'

export function KeywordTable() {
  const { constellationId, description } = useDescription()
  const descriptionId = description?.id
  const { keywordId } = useKeywordAnalysis()

  const {
    setFilter,
    ccPageSize,
    ccPageNumber,
    clFilterItem,
    ccSortOrder,
    ccSortBy,
  } = useFilterSelection('/_app/constellations_/$constellationId')
  const { analysisLayer } = useKeywordSelection()
  const { selectedMeasures, measureNameMap } = useMeasureSelection(ccSortBy)

  const {
    data: collocationItems, // TODO: Rename, it's not a collocation
    error,
    isLoading,
  } = useQuery({
    ...constellationKeywordAnalysisItems(
      constellationId,
      descriptionId!,
      keywordId!,
      {
        sortOrder: ccSortOrder,
        sortBy: ccSortBy,
        pageSize: ccPageSize,
        pageNumber: ccPageNumber,
      },
    ),
    retry: 0,
    enabled: descriptionId !== undefined && keywordId !== undefined,
  })

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
    <>
      <ErrorMessage error={[error]} />

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
                    <SortButtonLink
                      isSorted={isSorted}
                      replace
                      to="."
                      params={(p) => p}
                      search={(s) =>
                        isCurrent
                          ? {
                              ...s,
                              ccSortOrder:
                                ccSortOrder === 'descending'
                                  ? 'ascending'
                                  : 'descending',
                            }
                          : {
                              ...s,
                              ccSortBy: measure,
                              ccSortOrder: 'ascending',
                            }
                      }
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
    </>
  )
}

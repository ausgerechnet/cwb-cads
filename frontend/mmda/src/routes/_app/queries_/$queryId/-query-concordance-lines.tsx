import { useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'

import {
  queryConcordances,
  queryConcordanceContext,
} from '@cads/shared/queries'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { Pagination } from '@cads/shared/components/pagination'
import {
  ConcordanceTable,
  useConcordanceFilterContext,
} from '@cads/shared/components/concordances'

export function QueryConcordanceLines({
  queryId,
  className,
}: {
  queryId: number
  className?: string
}) {
  const nrLinesRef = useRef<number>(0)
  const pageCountRef = useRef<number>(0)

  const {
    primary,
    secondary,
    windowSize,
    clPageSize,
    clPageIndex,
    clSortByOffset,
    clSortOrder,
    clFilterItem,
    clFilterItemPAtt,
    clContextBreak,
    setPageSize,
    setPageIndex,
    setFilterItem,
  } = useConcordanceFilterContext()

  const {
    data: concordanceLines,
    isLoading,
    error,
  } = useQuery(
    queryConcordances(queryId, {
      primary,
      secondary,
      contextBreak: clContextBreak,
      window: windowSize,
      filterItem: clFilterItem,
      filterItemPAtt: clFilterItemPAtt,
      pageSize: clPageSize,
      pageNumber: clPageIndex + 1,
      sortOrder: clSortOrder,
      sortByOffset: clSortByOffset,
    }),
  )

  pageCountRef.current =
    concordanceLines?.page_count ?? pageCountRef.current ?? 0
  nrLinesRef.current = concordanceLines?.nr_lines ?? nrLinesRef.current ?? 0

  const fetchContext = useCallback(
    (matchId: number) =>
      queryConcordanceContext(queryId, matchId, {
        window: windowSize,
        extendedWindow: 100,
        primary,
        secondary,
      }),
    [primary, queryId, secondary, windowSize],
  )

  return (
    <div className={className}>
      <ErrorMessage className="col-span-full" error={error} />

      <div className="relative col-span-full flex flex-col gap-4">
        <div className="max-w-full rounded-md border">
          <ConcordanceTable
            concordanceLines={concordanceLines?.lines}
            isLoading={isLoading}
            rowCount={clPageSize}
            fetchContext={fetchContext}
            onItemClick={(word) => {
              console.log('clicked:', word)
              setFilterItem(word.secondary, secondary)
            }}
          />
        </div>

        <Pagination
          className="col-span-full"
          pageSize={clPageSize}
          pageCount={pageCountRef.current}
          totalRows={nrLinesRef.current}
          pageIndex={clPageIndex}
          setPageSize={setPageSize}
          setPageIndex={setPageIndex}
        />
      </div>
    </div>
  )
}

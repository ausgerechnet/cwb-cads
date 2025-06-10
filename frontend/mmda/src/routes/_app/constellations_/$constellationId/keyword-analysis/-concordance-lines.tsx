import { useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'

import {
  constellationConcordanceContext,
  constellationConcordances,
} from '@cads/shared/queries'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { Pagination } from '@cads/shared/components/pagination'
import { useDescription } from '@/routes/_app/constellations_/$constellationId/-use-description'
import { ConstellationConcordanceFilter } from '@/routes/_app/constellations_/$constellationId/-constellation-filter'
import {
  ConcordanceTable,
  useConcordanceFilterContext,
} from '@cads/shared/components/concordances'

import { Route } from './route'

export function ConstellationConcordanceLinesKeyword({
  className,
}: {
  className?: string
}) {
  const constellationId = parseInt(Route.useParams().constellationId)
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
    clFilterDiscoursemeIds,
    clContextBreak,
    clFocusDiscoursemeId,
    setPageSize,
    setPageIndex,
    setFilterItem,
  } = useConcordanceFilterContext()

  const descriptionId = useDescription()?.description?.id
  const enabled =
    clFocusDiscoursemeId !== undefined &&
    descriptionId !== undefined &&
    primary !== undefined &&
    secondary !== undefined

  const {
    data: concordanceLines,
    isLoading,
    error,
  } = useQuery({
    ...constellationConcordances(
      constellationId,
      descriptionId!,
      clFocusDiscoursemeId!,
      {
        primary,
        secondary,
        window: windowSize,
        filterItem: clFilterItem,
        filterItemPAtt: clFilterItemPAtt,
        pageSize: clPageSize,
        pageNumber: clPageIndex + 1,
        sortOrder: clSortOrder,
        sortByOffset: clSortByOffset,
        sortByPAtt: secondary,
        contextBreak: clContextBreak,
        filterDiscoursemeIds: clFilterDiscoursemeIds,
      },
    ),
    enabled,
  })

  pageCountRef.current =
    concordanceLines?.page_count ?? pageCountRef.current ?? 0
  nrLinesRef.current = concordanceLines?.nr_lines ?? nrLinesRef.current ?? 0

  const fetchContext = useCallback(
    (matchId: number) =>
      constellationConcordanceContext(
        constellationId,
        descriptionId!,
        matchId,
        clFocusDiscoursemeId!,
        {
          window: windowSize,
          extendedWindow: 100,
          primary: primary!,
          secondary: secondary!,
        },
      ),
    [
      constellationId,
      descriptionId,
      primary,
      secondary,
      windowSize,
      clFocusDiscoursemeId,
    ],
  )

  return (
    <div className={className}>
      <ErrorMessage className="col-span-full" error={error} />

      <ConstellationConcordanceFilter />

      {!enabled && (
        <div className="text-muted-foreground flex h-52 w-full items-center justify-center text-center">
          Please select a focus discourseme.
        </div>
      )}

      {enabled && secondary && (
        <>
          <div className="relative col-span-full flex flex-col gap-4">
            <div className="max-w-full rounded-md border">
              <ConcordanceTable
                concordanceLines={concordanceLines?.lines}
                isLoading={isLoading}
                rowCount={clPageSize}
                fetchContext={fetchContext}
                onItemClick={(word) => {
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
        </>
      )}
    </div>
  )
}

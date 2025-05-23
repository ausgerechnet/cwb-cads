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

import { useAnalysisSelection } from './-use-analysis-selection'
import { useUfa } from './-use-ufa'

export function ConstellationConcordanceLines({
  constellationId,
  className,
}: {
  constellationId: number
  className?: string
}) {
  const {
    analysisSelection: { analysisType } = {},
    analysisType: analysisTypeSelection,
  } = useAnalysisSelection()

  // Associations and breakdown view can never show concordance lines
  if (
    analysisTypeSelection === 'associations' ||
    analysisTypeSelection === 'breakdown'
  ) {
    return (
      <div className="text-muted-foreground flex h-52 w-full items-center justify-center text-center">
        Concordance lines are not available in {analysisTypeSelection} view.
      </div>
    )
  }

  if (analysisType === undefined) {
    return (
      <div className="text-muted-foreground flex h-52 w-full items-center justify-center text-center">
        No data available.
        <br />
        Finish your analysis selection.
      </div>
    )
  }

  if (analysisType === 'collocation') {
    return (
      <ConstellationConcordanceLinesCollocation
        constellationId={constellationId}
        className={className}
      />
    )
  }

  if (analysisType === 'keyword') {
    return (
      <ConstellationConcordanceLinesKeyword
        constellationId={constellationId}
        className={className}
      />
    )
  }

  if (analysisType === 'ufa') {
    return (
      <ConstellationConcordanceLinesUfa
        constellationId={constellationId}
        className={className}
      />
    )
  }

  throw new Error(`Unknown analysis type: ${analysisType}`)
}

function ConstellationConcordanceLinesUfa({
  constellationId,
  className,
}: {
  constellationId: number
  className?: string
}) {
  const nrLinesRef = useRef<number>(0)
  const pageCountRef = useRef<number>(0)

  const { focusDiscourseme } = useAnalysisSelection()

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
    setPageSize,
    setPageIndex,
    setFilterItem,
  } = useConcordanceFilterContext()
  const { ufaDescriptionId: descriptionId } = useUfa()

  const enabled =
    focusDiscourseme !== undefined &&
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
      focusDiscourseme!,
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
        focusDiscourseme!,
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
      focusDiscourseme,
      primary,
      secondary,
      windowSize,
    ],
  )

  return (
    <div className={className}>
      <ErrorMessage className="col-span-full" error={error} />

      <ConstellationConcordanceFilter />

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

function ConstellationConcordanceLinesKeyword({
  constellationId,
  className,
}: {
  constellationId: number
  className?: string
}) {
  const nrLinesRef = useRef<number>(0)
  const pageCountRef = useRef<number>(0)

  const { focusDiscourseme } = useAnalysisSelection()

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
    setPageSize,
    setPageIndex,
    setFilterItem,
  } = useConcordanceFilterContext()

  const descriptionId = useDescription()?.description?.id
  const enabled =
    focusDiscourseme !== undefined &&
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
      focusDiscourseme!,
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
        focusDiscourseme!,
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
      focusDiscourseme,
      primary,
      secondary,
      windowSize,
    ],
  )

  return (
    <div className={className}>
      <ErrorMessage className="col-span-full" error={error} />

      <ConstellationConcordanceFilter />

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

function ConstellationConcordanceLinesCollocation({
  constellationId,
  className,
}: {
  constellationId: number
  className?: string
}) {
  const nrLinesRef = useRef<number>(0)
  const pageCountRef = useRef<number>(0)

  const { focusDiscourseme, analysisLayer: secondary } = useAnalysisSelection()

  const {
    primary,
    windowSize,
    clPageSize,
    clPageIndex,
    clSortByOffset,
    clSortOrder,
    clFilterItem,
    clFilterItemPAtt,
    clFilterDiscoursemeIds,
    clContextBreak,
    setPageSize,
    setPageIndex,
    setFilterItem,
  } = useConcordanceFilterContext()

  const descriptionId = useDescription()?.description?.id
  const enabled =
    focusDiscourseme !== undefined &&
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
      focusDiscourseme!,
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
        focusDiscourseme!,
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
      focusDiscourseme,
      primary,
      secondary,
      windowSize,
    ],
  )

  return (
    <div className={className}>
      <ErrorMessage className="col-span-full" error={error} />

      <ConstellationConcordanceFilter />

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

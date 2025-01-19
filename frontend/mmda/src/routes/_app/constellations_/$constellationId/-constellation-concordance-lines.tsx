import { Fragment, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Link, useSearch } from '@tanstack/react-router'
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react'

import { schemas } from '@cads/shared/api-client'
import { cn } from '@cads/shared/lib/utils'
import { corpusById, constellationConcordances } from '@cads/shared/queries'
import { formatNumber } from '@cads/shared/lib/format-number'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@cads/shared/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@cads/shared/components/ui/tooltip'
import { ButtonTooltip } from '@/components/button-tooltip'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { Repeat } from '@cads/shared/components/repeat'
import { Pagination } from '@cads/shared/components/pagination'
import { Skeleton } from '@cads/shared/components/ui/skeleton'
import { useFilterSelection } from '@/routes/_app/constellations_/$constellationId/-use-filter-selection'
import { useDescription } from '@/routes/_app/constellations_/$constellationId/-use-description'
import { ConstellationConcordanceFilter } from '@/routes/_app/constellations_/$constellationId/-constellation-filter'
import { Ellipsis } from '@cads/shared/components/ellipsis'
import { getColorForNumber } from '@cads/shared/lib/get-color-for-number'

const emptyArray = [] as const

export function ConstellationConcordanceLines({
  constellationId,
  corpusId,
  className,
}: {
  constellationId: number
  corpusId: number
  className?: string
}) {
  const { data: corpus } = useQuery(corpusById(corpusId as number))
  const nrLinesRef = useRef<number>(0)
  const pageCountRef = useRef<number>(0)

  // TODO: use a hook that handles default values etc. useFilterSelection()
  const searchParams = useSearch({
    from: '/_app/constellations_/$constellationId',
  })
  const pAttributes = corpus?.p_atts ?? emptyArray
  // TODO: why not from hook?!
  const primary =
    searchParams.primary ??
    pAttributes.find((a) => a === 'word') ??
    pAttributes[0]

  // Remember a few values between renders: this helps rendering a proper skeleton
  // thus avoiding flicker
  // TODO: maybe just remember the last concordanceLines and overlay a spinner?
  const secondary = searchParams.secondary ?? pAttributes[0]
  const {
    windowSize,
    clPageSize,
    clPageIndex,
    clSortByOffset,
    clSortOrder,
    clFilterItem,
    clFilterItemPAtt,
    focusDiscourseme,
    setFilter,
  } = useFilterSelection('/_app/constellations_/$constellationId')
  const descriptionId = useDescription()?.description?.id

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
      },
    ),
    enabled: focusDiscourseme !== undefined && descriptionId !== undefined,
  })

  pageCountRef.current =
    concordanceLines?.page_count ?? pageCountRef.current ?? 0
  nrLinesRef.current = concordanceLines?.nr_lines ?? nrLinesRef.current ?? 0

  return (
    <div className={className}>
      <ErrorMessage className="col-span-full" error={error} />

      <ConstellationConcordanceFilter />

      <div className="relative col-span-full flex flex-col gap-4">
        <div className="max-w-full rounded-md border">
          <Table
            className="grid w-full grid-cols-[min-content_1fr_max-content_1fr_min-content] overflow-hidden"
            isNarrow
          >
            <TableHeader className="col-span-full grid grid-cols-subgrid">
              <TableRow className="col-span-full grid grid-cols-subgrid">
                <TableHead className="flex items-center">ID</TableHead>
                <TableHead className="flex items-center justify-end">
                  Context
                </TableHead>
                <TableHead className="flex items-center justify-center">
                  Keyword
                </TableHead>
                <TableHead className="flex items-center">Context</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody className="col-span-full grid grid-cols-subgrid">
              {concordanceLines?.lines?.map((line) => (
                <ConcordanceLineRender
                  key={line.match_id}
                  concordanceLine={line}
                />
              ))}
              {isLoading && (
                <Repeat count={clPageSize}>
                  <TableRow className="col-span-full grid grid-cols-subgrid">
                    <TableCell className="col-span-full">
                      <Skeleton className="h-5" />
                    </TableCell>
                  </TableRow>
                </Repeat>
              )}
            </TableBody>
          </Table>
        </div>
        <Pagination
          className="col-span-full"
          pageSize={clPageSize}
          pageCount={pageCountRef.current}
          totalRows={nrLinesRef.current}
          pageIndex={clPageIndex}
          setPageSize={(pageSize) => setFilter('clPageSize', pageSize)}
          setPageIndex={(pageIndex) => setFilter('clPageIndex', pageIndex)}
        />
      </div>
    </div>
  )
}

function MetaValue({ value }: { value: unknown }) {
  if (typeof value === 'string') {
    return <>{value}</>
  }
  if (typeof value === 'number') {
    return <>{value}</>
  }
  if (typeof value === 'boolean') {
    return <>{value ? 'true' : 'false'}</>
  }
  if (value instanceof Date) {
    return <>{value.toISOString()}</>
  }
  return String(value)
}

function ConcordanceLineRender({
  concordanceLine: {
    match_id,
    tokens = [],
    structural = {},
    discourseme_ranges,
  },
}: {
  concordanceLine: z.infer<typeof schemas.ConcordanceLineOut>
}) {
  const { secondary } = useFilterSelection(
    '/_app/constellations_/$constellationId',
  )
  const { preTokens, postTokens, midTokens } = useMemo(
    () => ({
      preTokens: tokens.filter(({ offset = NaN }) => offset < 0) ?? emptyArray,
      midTokens:
        tokens.filter(({ offset = NaN }) => offset === 0) ?? emptyArray,
      postTokens: tokens.filter(({ offset = NaN }) => offset > 0) ?? emptyArray,
    }),
    [tokens],
  )

  const meta = Object.entries(structural)
  const isExpanded = false

  return (
    <TableRow key={match_id} className="col-span-full grid grid-cols-subgrid">
      <TableCell className="w-max">
        <TooltipProvider>
          <Tooltip delayDuration={100}>
            <TooltipTrigger className="font-muted-foreground text-xs">
              {formatNumber(match_id ?? 0)}
            </TooltipTrigger>
            {meta.length > 0 && (
              <TooltipContent side="top" sideOffset={10}>
                <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1">
                  {meta.map(([key, value]) => (
                    <Fragment key={key}>
                      <dt className="even:bg-muted">{key}</dt>
                      <dd className="font-mono">
                        <MetaValue value={value} />
                      </dd>
                    </Fragment>
                  ))}
                </dl>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="w-auto overflow-hidden whitespace-nowrap pr-1">
        <Ellipsis direction="rtl">
          <TokenLine
            tokens={preTokens}
            discoursemeRanges={discourseme_ranges}
            secondary={secondary}
          />
        </Ellipsis>
      </TableCell>
      <TableCell className="mx-auto flex w-max items-center whitespace-nowrap px-1 text-center">
        <TokenLine
          tokens={midTokens}
          discoursemeRanges={discourseme_ranges}
          secondary={secondary}
        />
      </TableCell>
      <TableCell className="w-auto overflow-hidden whitespace-nowrap pr-1">
        <Ellipsis direction="ltr">
          <TokenLine
            tokens={postTokens}
            discoursemeRanges={discourseme_ranges}
            secondary={secondary}
          />
        </Ellipsis>
      </TableCell>
      <TableCell className="flex w-max items-center py-0">
        <ButtonTooltip
          tooltip={isExpanded ? 'Collapse' : 'Expand'}
          size="icon"
          variant="ghost"
          className="-mx-3 h-4"
        >
          {isExpanded ? (
            <ChevronsDownUp className="h-4 w-4" />
          ) : (
            <ChevronsUpDown className="h-4 w-4" />
          )}
        </ButtonTooltip>
      </TableCell>
    </TableRow>
  )
}

export function TokenLine({
  tokens,
  secondary,
  discoursemeRanges,
}: {
  tokens: z.infer<typeof schemas.TokenOut>[]
  discoursemeRanges: z.infer<typeof schemas.DiscoursemeRangeOut>[]
  secondary?: string
}) {
  const tokenData = useMemo(() => {
    const tokenData: [
      (typeof tokens)[number],
      {
        discoursemeId: number
        isStart: boolean
        isEnd: boolean
        offset?: number
      }[],
    ][] = []
    let tokenOffsets: { id: number; offset: number }[] = []
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      const { cpos } = token
      const tokenDiscoursemes = discoursemeRanges
        .filter(({ start, end }) => start <= cpos && end >= cpos)
        .map(({ discourseme_id, start, end }) => ({
          discoursemeId: discourseme_id,
          isStart: start === cpos,
          isEnd: end === cpos,
        }))
      const activeDiscoursemeIds = tokenDiscoursemes.map(
        ({ discoursemeId }) => discoursemeId,
      )
      tokenOffsets = tokenOffsets.filter(({ id }) =>
        activeDiscoursemeIds.includes(id),
      )
      const tokenDiscoursemesWithOffset = tokenDiscoursemes.map(
        ({ discoursemeId, ...d }) => {
          let newOffset = tokenOffsets.find(
            ({ id }) => discoursemeId === id,
          )?.offset
          if (newOffset === undefined) {
            newOffset = 0
            while (tokenOffsets.some(({ offset }) => offset === newOffset)) {
              newOffset += 2
            }
            tokenOffsets.push({ offset: newOffset, id: discoursemeId })
          }
          return {
            discoursemeId,
            offset: newOffset,
            ...d,
          }
        },
      )
      tokenData.push([token, tokenDiscoursemesWithOffset])
    }
    return tokenData
  }, [discoursemeRanges, tokens])

  return (
    <>
      {tokenData.map(([token, discoursemes]) => (
        <TokenRender
          key={token.cpos}
          token={token}
          discoursemes={discoursemes}
          secondary={secondary}
        />
      ))}
    </>
  )
}

function TokenRender({
  token,
  discoursemes: discoursemes = [],
  secondary,
}: {
  token: z.infer<typeof schemas.TokenOut>
  discoursemes: {
    discoursemeId: number
    isStart: boolean
    isEnd: boolean
    offset?: number
  }[]
  secondary?: string
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            replace
            to=""
            params={(p) => p}
            search={(s) => ({
              ...s,
              clFilterItem: token.secondary,
              clFilterItemPAtt: secondary,
            })}
            className={cn(
              'hover:bg-muted hover:ring-muted relative cursor-pointer rounded-md px-0.5 hover:ring-2',
              token.out_of_window && 'text-muted-foreground/70',
              token.is_filter_item && 'bg-primary/50',
              token.offset === 0 && 'font-bold',
            )}
          >
            {discoursemes.map(
              ({ discoursemeId, isStart, isEnd, offset = 0 }) => (
                <span
                  key={discoursemeId}
                  data-x={`${isStart ? 'start' : ''}${isEnd ? 'end' : ''}`}
                  className={cn(
                    'absolute inset-0 border-y',
                    isStart && 'rounded-l-md border-l',
                    isEnd && 'rounded-r-md border-r',
                  )}
                  style={{
                    borderColor: getColorForNumber(discoursemeId),
                    backgroundColor: getColorForNumber(discoursemeId, 0.2),
                    top: -offset,
                    bottom: -offset,
                  }}
                />
              ),
            )}
            <span className="relative">{token.primary} </span>
          </Link>
        </TooltipTrigger>
        <TooltipContent>{token.secondary}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

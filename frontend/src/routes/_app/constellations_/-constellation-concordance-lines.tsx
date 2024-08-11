import { Fragment, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react'

import { schemas } from '@/rest-client'
import { cn } from '@/lib/utils'
import { corpusById, constellationConcordances } from '@/lib/queries'
import { formatNumber } from '@/lib/format-number'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ButtonTooltip } from '@/components/button-tooltip'
import { ErrorMessage } from '@/components/error-message'
import { Repeat } from '@/components/repeat'
import { Pagination } from '@/components/pagination'
import { Skeleton } from '@/components/ui/skeleton'

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
  const navigate = useNavigate()
  const nrLinesRef = useRef<number>(0)
  const pageCountRef = useRef<number>(0)

  const searchParams = useSearch({
    from: '/_app/constellations/$constellationId',
  })
  const pAttributes = corpus?.p_atts ?? emptyArray
  const primary = searchParams.primary ?? pAttributes[0]

  // Remember a few values between renders: this helps rendering a proper skeleton
  // thus avoiding flicker
  // TODO: maybe just remember the last concordanceLines and overlay a spinner?
  const secondary = searchParams.secondary ?? pAttributes[0]
  const {
    windowSize = 3,
    clPageSize = 10,
    clPageIndex = 0,
    clSortByOffset = 0,
    clSortOrder = 'random',
    filterItem,
    filterItemPAtt,
    focusDiscourseme,
  } = searchParams

  const {
    data: concordanceLines,
    isLoading,
    error,
  } = useQuery({
    ...constellationConcordances(constellationId, corpusId, focusDiscourseme!, {
      primary,
      secondary,
      window: windowSize,
      filterItem,
      filterItemPAtt,
      pageSize: clPageSize,
      pageNumber: clPageIndex + 1,
      sortOrder: clSortOrder,
      sortByOffset: clSortByOffset,
    }),
    enabled: focusDiscourseme !== undefined,
  })

  pageCountRef.current =
    concordanceLines?.page_count ?? pageCountRef.current ?? 0
  nrLinesRef.current = concordanceLines?.nr_lines ?? nrLinesRef.current ?? 0

  return (
    <div className={className}>
      <ErrorMessage className="col-span-full" error={error} />

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
          setPageSize={(pageSize) => {
            navigate({
              params: (p) => p,
              search: (s) => ({ ...s, clPageSize: pageSize }),
              replace: true,
            })
          }}
          setPageIndex={(pageIndex) => {
            navigate({
              params: (p) => p,
              search: (s) => ({ ...s, clPageIndex: pageIndex }),
              replace: true,
            })
          }}
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
  concordanceLine: { match_id, tokens = [], structural = {} },
}: {
  concordanceLine: z.infer<typeof schemas.ConcordanceLineOut>
}) {
  const keywordIndex =
    tokens.findIndex(({ offset = NaN }) => offset === 0) ?? emptyArray
  const preTokens =
    tokens.filter(({ offset = NaN }) => offset < 0) ?? emptyArray
  const postTokens =
    tokens.filter(({ offset = NaN }) => offset > 0) ?? emptyArray

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
      <TableCell className="w-auto overflow-hidden overflow-ellipsis whitespace-nowrap pr-1 text-right [direction:rtl]">
        {preTokens.map((token, i) => (
          <TokenRender key={i} token={token} />
        ))}
      </TableCell>
      <TableCell className="mx-auto flex w-max items-center whitespace-nowrap px-1 text-center">
        <TokenRender token={tokens[keywordIndex]} />
      </TableCell>
      <TableCell className="w-auto items-center gap-1 overflow-hidden overflow-ellipsis whitespace-nowrap px-0 pl-1 text-left">
        {postTokens.map((token, i) => (
          <TokenRender key={i} token={token} />
        ))}
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

function TokenRender({ token }: { token: z.infer<typeof schemas.TokenOut> }) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            replace
            params={(p) => p}
            search={(s) => ({ ...s, filterItem: token.primary })}
            className={cn(
              'cursor-pointer rounded-md hover:bg-muted hover:ring-2 hover:ring-muted',
              token.out_of_window && 'text-muted-foreground/70',
              token.is_filter_item && 'bg-primary/50',
              token.offset === 0 && 'font-bold',
            )}
          >
            {token.primary}{' '}
          </Link>
        </TooltipTrigger>
        <TooltipContent>{token.secondary}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

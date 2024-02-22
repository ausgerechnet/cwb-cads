import { Fragment, useRef } from 'react'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react'

import { schemas } from '@/rest-client'
import { cn } from '@/lib/utils'
import { queryConcordancesQueryOptions, queryQueryOptions } from '@/lib/queries'
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
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Repeat } from '@/components/repeat'
import { Pagination } from '@/components/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'

const emptyArray = [] as const

export function ConcordanceLines({
  queryId,
  className,
}: {
  queryId: string
  className?: string
}) {
  const { data: query } = useSuspenseQuery(queryQueryOptions(queryId))
  const navigate = useNavigate()

  const totalRowsRef = useRef(0)
  const searchParams = useSearch({ from: '/_app/queries/$queryId' })
  const contextBreakList = query.corpus?.s_atts ?? emptyArray
  const pAttributes = query.corpus?.p_atts ?? emptyArray
  const primary =
    searchParams.primary ??
    // It seems sensible to default to 'word'
    pAttributes.find((p) => p === 'word') ??
    pAttributes[0]

  // Remember a few values between renders: this helps rendering a proper skeleton
  // thus avoiding flicker
  // TODO: maybe just remember the last concordanceLines and overlay a spinner?
  const secondary = searchParams.secondary ?? pAttributes[0]
  const contextBreak = searchParams.contextBreak ?? contextBreakList[0]
  const {
    windowSize = 3,
    clPageSize = 10,
    clPageIndex = 0,
    clSortBy = 0,
    clSortOrder = 0,
    filterItem,
  } = searchParams

  const {
    data: concordanceLines,
    isLoading,
    error,
  } = useQuery(
    queryConcordancesQueryOptions(
      queryId,
      {
        contextBreak,
        primary,
        secondary,
        window: windowSize,
        filterItem,
      },
      {
        pageSize: clPageSize,
        pageNumber: clPageIndex + 1,
        sortBy: clSortBy,
        sortOrder: clSortOrder,
      },
    ),
  )

  totalRowsRef.current =
    concordanceLines?.[0]?.nr_lines_total ?? totalRowsRef.current ?? 0
  const pageCount = Math.ceil(totalRowsRef.current / clPageSize)

  return (
    <div className={className}>
      <div className="mb-8 grid grid-cols-6 gap-8">
        <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
          <span>Window Size {windowSize}</span>
          <Slider
            value={[windowSize]}
            onValueChange={([newValue]) => {
              navigate({
                params: (p) => p,
                search: (s) => ({ ...s, windowSize: newValue }),
                replace: true,
              })
            }}
            min={0}
            max={24}
            className="my-auto"
          />
        </div>
        <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
          <span>Sort By {clSortBy}</span>
          <Slider
            value={[clSortBy]}
            onValueChange={([newValue]) => {
              navigate({
                params: (p) => p,
                search: (s) => ({ ...s, clSortBy: newValue }),
                replace: true,
              })
            }}
            min={-5}
            max={5}
            className="my-auto"
          />
        </div>

        <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
          <span>Sort Order (Why int?)</span>
          <Input
            value={clSortOrder}
            type="number"
            onChange={(event) => {
              const value = parseInt(event.target.value)
              navigate({
                params: (p) => p,
                search: (s) => ({ ...s, clSortOrder: value }),
                replace: true,
              })
            }}
          />
        </div>

        <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
          <span>Context Break</span>
          <Select
            value={contextBreak}
            onValueChange={(value) => {
              navigate({
                params: (p) => p,
                search: (s) => ({ ...s, contextBreak: value }),
                replace: true,
              })
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Context Break" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {contextBreakList.map((contextBreak) => (
                  <SelectItem key={contextBreak} value={contextBreak}>
                    {contextBreak}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
          <span>Primary</span>
          <Select
            value={primary}
            onValueChange={(value) => {
              navigate({
                params: (p) => p,
                search: (s) => ({ ...s, primary: value }),
                replace: true,
              })
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Primary" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {pAttributes.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
          <span>Secondary</span>
          <Select
            value={secondary}
            onValueChange={(value) => {
              navigate({
                params: (p) => p,
                search: (s) => ({ ...s, secondary: value }),
                replace: true,
              })
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Secondary" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {pAttributes.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
      <ErrorMessage className="col-span-full" error={error} />
      <div className="relative col-span-full flex flex-col gap-4">
        <div className="max-w-full rounded-md border">
          <Table className="grid w-full grid-cols-[min-content_1fr_max-content_1fr_min-content] overflow-hidden">
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
              {concordanceLines?.map((line) => (
                <ConcordanceLineRender key={line.id} concordanceLine={line} />
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
          pageCount={pageCount}
          totalRows={totalRowsRef.current}
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

function MetaValue({ value }: { value: Date | string | boolean | number }) {
  if (typeof value === 'string') {
    return <>{value}</>
  }
  if (typeof value === 'number') {
    return <>{value}</>
  }
  if (typeof value === 'boolean') {
    return <>{value ? 'true' : 'false'}</>
  }
  return <>{value.toISOString()}</>
}

function ConcordanceLineRender({
  concordanceLine: { id, tokens = [], discourseme_ranges: discoursemeRanges },
}: {
  concordanceLine: z.infer<typeof schemas.ConcordanceLineOut>
}) {
  if (discoursemeRanges?.length) {
    console.log('discoursemeRanges', discoursemeRanges)
  }
  const keywordIndex =
    tokens.findIndex(({ offset = NaN }) => offset === 0) ?? emptyArray
  const preTokens =
    tokens.filter(({ offset = NaN }) => offset < 0) ?? emptyArray
  const postTokens =
    tokens.filter(({ offset = NaN }) => offset > 0) ?? emptyArray

  const meta: { key: string; value: string }[] = []
  const isExpanded = false

  return (
    <TableRow key={id} className="col-span-full grid grid-cols-subgrid">
      <TableCell className="w-max">
        <TooltipProvider>
          <Tooltip delayDuration={100}>
            <TooltipTrigger className="font-muted-foreground text-xs">
              {formatNumber(id ?? 0)}
            </TooltipTrigger>
            {meta.length > 0 && (
              <TooltipContent side="top" sideOffset={10}>
                <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1">
                  {meta.map(({ key, value }) => (
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
          size="sm"
          variant="ghost"
          className="-mx-3"
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
  const { filterItem } = useSearch({ from: '/_app/queries/$queryId' })
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
              token.offset === 0 && 'font-bold',
              token.primary === filterItem && 'bg-primary/50',
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

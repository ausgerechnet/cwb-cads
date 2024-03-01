import { Fragment, useMemo, useRef } from 'react'
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ChevronsDownUp, ChevronsUpDown, Loader2, Shuffle } from 'lucide-react'

import { schemas } from '@/rest-client'
import { cn } from '@/lib/utils'
import {
  queryConcordancesQueryOptions,
  queryConcordancesShuffleMutationOptions,
  queryQueryOptions,
} from '@/lib/queries'
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
import { Button } from '@/components/ui/button'

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
  const nrLinesRef = useRef<number>(0)
  const pageCountRef = useRef<number>(0)

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
    clSortByOffset = 0,
    clSortOrder = 'random',
    filterItem,
    filterItemPAtt,
  } = searchParams

  const {
    data: concordanceLines,
    isLoading,
    error,
    refetch: refetchConcordanceLines,
  } = useQuery(
    queryConcordancesQueryOptions(queryId, {
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
  )
  const { mutate: shuffle, isPending: isShuffling } = useMutation({
    ...queryConcordancesShuffleMutationOptions,
    onSettled: () => refetchConcordanceLines(),
  })

  pageCountRef.current =
    concordanceLines?.page_count ?? pageCountRef.current ?? 0
  nrLinesRef.current = concordanceLines?.nr_lines ?? nrLinesRef.current ?? 0

  // TODO: Make it type safe
  const setSearch = useMemo(() => {
    const timeoutMap: Record<string, ReturnType<typeof setTimeout>> = {}
    return (paramName: string, value: string | number) => {
      clearTimeout(timeoutMap[paramName])
      timeoutMap[paramName] = setTimeout(() => {
        navigate({
          params: (p) => p,
          search: (s) => ({ ...s, [paramName]: value }),
          replace: true,
        })
      }, 200)
    }
  }, [navigate])

  return (
    <div className={className}>
      <div className="mb-8 grid grid-cols-8 gap-2">
        <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
          <span>Window Size {windowSize}</span>
          <Slider
            defaultValue={[windowSize]}
            onValueChange={([newValue]) => setSearch('windowSize', newValue)}
            min={0}
            max={24}
            className="my-auto"
          />
        </div>
        <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
          <span>Sort By Offset {clSortByOffset}</span>
          <Slider
            defaultValue={[clSortByOffset]}
            onValueChange={([newValue]) =>
              setSearch('clSortByOffset', newValue)
            }
            min={-5}
            max={5}
            className="my-auto"
          />
        </div>

        <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
          <span>Sort Order</span>
          <Select
            value={clSortOrder}
            onValueChange={(value) => setSearch('clSortOrder', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sort Order" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {['ascending', 'descending', 'random'].map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
          <span>Filter Item PAtt</span>
          <Select
            value={filterItemPAtt}
            onValueChange={(value) => setSearch('filterItemPAtt', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter Item PAttr" />
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
          <span>Context Break</span>
          <Select
            value={contextBreak}
            onValueChange={(value) => setSearch('contextBreak', value)}
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
            onValueChange={(value) => setSearch('secondary', value)}
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

        <Button
          className="mt-auto"
          onClick={() => {
            shuffle(queryId)
          }}
          disabled={isShuffling}
        >
          {isShuffling ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Shuffle className="mr-2 h-4 w-4" />
          )}
          Shuffle
        </Button>
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
              {concordanceLines?.lines?.map((line) => (
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

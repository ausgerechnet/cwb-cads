import { Fragment, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react'

import { schemas } from '../../api-client'

import { formatNumber } from '../../lib/format-number'
import { cn } from '../../lib/utils'
import { getColorForNumber } from '../../lib/get-color-for-number'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '../ui/tooltip'
import { TableCell, TableRow } from '../ui/table'
import { Ellipsis } from '../ellipsis'
import { ButtonTooltip } from '../button-tooltip'
import { ErrorMessage } from '../error-message'
import { useConcordanceContext } from './concordance-context'

export function ConcordanceLineRender({
  concordanceLine: {
    match_id,
    tokens = [],
    structural = {},
    discourseme_ranges,
  },
}: {
  concordanceLine: z.infer<typeof schemas.ConcordanceLineOut>
}) {
  const { fetchContext } = useConcordanceContext()
  const meta = useMemo(() => Object.entries(structural), [structural])
  const [isExpanded, setIsExpanded] = useState(false)
  const {
    data: extendedLine,
    isLoading,
    error,
  } = useQuery({ ...fetchContext(match_id), enabled: isExpanded })

  const { preTokens, postTokens, midTokens } = useMemo(() => {
    const selectedTokens = isExpanded
      ? (extendedLine?.tokens ?? tokens)
      : tokens
    return {
      preTokens: selectedTokens.filter(({ offset = NaN }) => offset < 0) ?? [],
      midTokens:
        selectedTokens.filter(({ offset = NaN }) => offset === 0) ?? [],
      postTokens: selectedTokens.filter(({ offset = NaN }) => offset > 0) ?? [],
    }
  }, [tokens, isExpanded, extendedLine])

  const displayAsExpanded = isExpanded && !isLoading && Boolean(extendedLine)

  return (
    <TableRow
      key={match_id}
      className={cn(
        'col-span-full grid grid-cols-subgrid',
        isLoading && 'animate-pulse',
      )}
    >
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

      <TableCell
        className={cn(
          'w-auto pr-1',
          !displayAsExpanded && 'overflow-hidden whitespace-nowrap',
          displayAsExpanded && 'text-right',
        )}
      >
        <ExpandableTokenLine
          tokens={preTokens}
          discoursemeRanges={discourseme_ranges}
          direction="rtl"
          isExpanded={displayAsExpanded}
        />
      </TableCell>

      <TableCell className="mx-auto flex w-max items-center whitespace-nowrap px-1 text-center">
        <TokenLine tokens={midTokens} discoursemeRanges={discourseme_ranges} />
      </TableCell>

      <TableCell
        className={cn(
          'w-auto pr-1',
          !displayAsExpanded && 'overflow-hidden whitespace-nowrap',
        )}
      >
        <ExpandableTokenLine
          tokens={postTokens}
          discoursemeRanges={discourseme_ranges}
          direction="ltr"
          isExpanded={displayAsExpanded}
        />
      </TableCell>

      <TableCell className="flex w-max items-center py-0">
        <ErrorMessage error={error} />

        <ButtonTooltip
          onClick={() => setIsExpanded((prev) => !prev)}
          tooltip={isExpanded ? 'Collapse' : 'Expand'}
          size="icon"
          variant="ghost"
          className={cn('-mx-3 h-4', isExpanded && 'h-full')}
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

function ExpandableTokenLine({
  tokens,
  discoursemeRanges,
  direction,
  isExpanded,
}: {
  tokens: z.infer<typeof schemas.TokenOut>[]
  discoursemeRanges: z.infer<typeof schemas.DiscoursemeRangeOut>[]
  direction: 'ltr' | 'rtl'
  isExpanded: boolean
}) {
  if (isExpanded) {
    return <TokenLine tokens={tokens} discoursemeRanges={discoursemeRanges} />
  }
  return (
    <Ellipsis direction={direction}>
      <TokenLine tokens={tokens} discoursemeRanges={discoursemeRanges} />
    </Ellipsis>
  )
}

function TokenLine({
  tokens,
  discoursemeRanges,
}: {
  tokens: z.infer<typeof schemas.TokenOut>[]
  discoursemeRanges: z.infer<typeof schemas.DiscoursemeRangeOut>[]
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
        />
      ))}
    </>
  )
}

function TokenRender({
  token,
  discoursemes: discoursemes = [],
}: {
  token: z.infer<typeof schemas.TokenOut>
  discoursemes: {
    discoursemeId: number
    isStart: boolean
    isEnd: boolean
    offset?: number
  }[]
}) {
  const { onItemClick } = useConcordanceContext()
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onItemClick(token)}
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
          </button>
        </TooltipTrigger>
        <TooltipContent>{token.secondary}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
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

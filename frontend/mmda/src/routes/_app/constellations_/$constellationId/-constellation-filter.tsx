import { Fragment } from 'react'
import { FilterIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectValue,
} from '@cads/shared/components/ui/select'
import { cn } from '@cads/shared/lib/utils'
import {
  FilterSchema,
  useFilterSelection,
} from '@/routes/_app/constellations_/$constellationId/-use-filter-selection'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { SelectMulti } from '@cads/shared/components/select-multi'
import { discoursemesList } from '@cads/shared/queries'
import { useDescription } from './-use-description'
import { Link } from '@tanstack/react-router'
import { DiscoursemeName } from '@cads/shared/components/discourseme-name'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@cads/shared/components/ui/tooltip'
import {
  ContextBreakInput,
  FilterItemInput,
  PrimaryInput,
  SortByOffsetInput,
  SortOrderInput,
  WindowSizeInput,
} from '@cads/shared/components/concordances'
import { LabelBox } from '@cads/shared/components/label-box'

// TODO: Unify this with -query-filter.tsx
export function ConstellationCollocationFilter({
  className,
  hideSortOrder = false,
}: {
  className?: string
  hideSortOrder?: boolean
}) {
  const {
    ccSortOrder,
    ccFilterDiscoursemeIds,
    clFilterDiscoursemeIds,
    setFilter,
    ccSortBy,
  } = useFilterSelection('/_app/constellations_/$constellationId')

  const discoursemeFiltersDiffer =
    ccFilterDiscoursemeIds.length !== clFilterDiscoursemeIds.length ||
    ccFilterDiscoursemeIds.some((id) => !clFilterDiscoursemeIds.includes(id))

  return (
    <div
      className={cn(
        'bg-background z-10 grid grid-flow-col gap-2 [grid-auto-columns:1fr]',
        className,
      )}
    >
      <WindowSizeInput />

      <ContextBreakInput />

      <div className="flex flex-grow flex-col gap-1 whitespace-nowrap">
        <span className="text-xs">Association Measure</span>
        <Select
          value={ccSortBy}
          onValueChange={(value) => {
            const sortBy = FilterSchema.shape.ccSortBy.parse(value)
            setFilter('ccSortBy', sortBy)
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Association Measure" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {/* TODO: extract! */}
              {[
                'conservative_log_ratio',
                'O11',
                'E11',
                'ipm',
                'log_likelihood',
                'z_score',
                't_score',
                'simple_ll',
                'dice',
                'log_ratio',
                'min_sensitivity',
                'liddell',
                'mutual_information',
                'local_mutual_information',
              ].map((value) => (
                <SelectItem key={value} value={value}>
                  {value.replaceAll('_', ' ')}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-grow flex-col gap-1 whitespace-nowrap">
        <span className="text-xs">Filter Discoursemes</span>

        <div className="flex gap-2">
          <ul className="border-input my-0 flex min-h-10 grow flex-wrap gap-1 overflow-hidden overflow-ellipsis rounded-md border px-3 py-2">
            {ccFilterDiscoursemeIds.map((id, index, { length }) => (
              <li
                key={id}
                className="my-auto inline text-ellipsis text-xs leading-none"
              >
                <DiscoursemeName discoursemeId={id} />
                {index < length - 1 && ', '}
              </li>
            ))}
          </ul>

          {discoursemeFiltersDiffer && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    className={cn(
                      buttonVariants({
                        variant: 'default',
                        size: 'sm',
                      }),
                      'my-auto ml-auto',
                    )}
                    to=""
                    search={(s) => ({
                      ...s,
                      ccPageNumber: 1,
                      ccFilterDiscoursemeIds: [
                        ...(s.clFilterDiscoursemeIds ?? []),
                      ],
                    })}
                    params={(p) => p}
                  >
                    <FilterIcon className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Apply Filter Discoursemes from concordance lines:
                  <br />
                  {clFilterDiscoursemeIds.map((id, index, { length }) => (
                    <Fragment key={id}>
                      <DiscoursemeName discoursemeId={id} />
                      {index < length - 1 && ', '}
                    </Fragment>
                  ))}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {!hideSortOrder && (
        <div className="flex flex-grow flex-col gap-1 whitespace-nowrap">
          <span className="text-xs">Sort Order</span>

          <Select
            value={ccSortOrder}
            onValueChange={(value) =>
              setFilter(
                'ccSortOrder',
                FilterSchema.shape.ccSortOrder.parse(value),
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Sort Order" />
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                {['ascending', 'descending'].map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}

export function ConstellationConcordanceFilter({
  className,
}: {
  className?: string
}) {
  return (
    <div className={cn('z-10 mb-8 grid grid-cols-6 gap-2', className)}>
      <LabelBox labelText="Filter Discoursemes" className="col-span-2">
        <FilterDiscoursemes className="w-full" />
      </LabelBox>

      <SortByOffsetInput />

      <SortOrderInput />

      <PrimaryInput />

      <FilterItemInput />
    </div>
  )
}

function FilterDiscoursemes({ className }: { className?: string }) {
  const { setFilters, clFilterDiscoursemeIds } = useFilterSelection(
    '/_app/constellations_/$constellationId',
  )
  const { description } = useDescription()
  const {
    data: allDiscoursemes = [],
    isLoading,
    error,
  } = useQuery(discoursemesList)
  const constellationIds = (description?.discourseme_descriptions ?? []).map(
    (d) => d.discourseme_id,
  )
  const discoursemes = allDiscoursemes
    .filter((d) => constellationIds.includes(d.id))
    .map((d) => ({ id: d.id!, name: d.name! }))

  return (
    <SelectMulti
      items={discoursemes}
      itemIds={clFilterDiscoursemeIds}
      selectMessage="Select a discourseme…"
      emptyMessage="No discoursemes found…"
      onChange={(ids) =>
        setFilters({ clFilterDiscoursemeIds: ids, clPageIndex: 0 })
      }
      disabled={isLoading || Boolean(error)}
      className={cn(
        isLoading && 'animate-pulse',
        Boolean(error) && 'text-destructive-foreground',
        className,
      )}
    />
  )
}

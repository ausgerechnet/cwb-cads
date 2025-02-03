import { XIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectValue,
} from '@cads/shared/components/ui/select'
import { Slider } from '@cads/shared/components/ui/slider'
import { cn } from '@cads/shared/lib/utils'
import {
  FilterSchema,
  useFilterSelection,
} from '@/routes/_app/constellations_/$constellationId/-use-filter-selection'
import { SortByOffset } from '@/components/sort-by-offset'
import { Button } from '@cads/shared/components/ui/button'
import { SelectMulti } from '@cads/shared/components/select-multi'
import { discoursemesList } from '@cads/shared/queries'
import { useDescription } from './-use-description'

// TODO: Unify this with -query-filter.tsx
export function ConstellationCollocationFilter({
  className,
  hideSortOrder = false,
}: {
  className?: string
  hideSortOrder?: boolean
}) {
  const {
    isSortable,
    windowSize,
    ccSortOrder,
    s,
    secondary,
    setFilter,
    pAttributes,
    contextBreakList,
    ccSortBy,
  } = useFilterSelection('/_app/constellations_/$constellationId')

  return (
    <div
      className={cn(
        'bg-background z-10 grid grid-flow-col gap-2 [grid-auto-columns:1fr]',
        className,
      )}
    >
      <div className="flex flex-grow flex-col gap-1 whitespace-nowrap">
        <span className="text-xs">Window Size {windowSize}</span>
        <Slider
          defaultValue={[windowSize]}
          onValueChange={([newValue]) => setFilter('windowSize', newValue)}
          min={0}
          max={24}
          className="my-auto"
        />
      </div>

      <div className="flex flex-grow flex-col gap-1 whitespace-nowrap">
        <span className="text-xs">Context Break</span>
        <Select value={s} onValueChange={(value) => setFilter('s', value)}>
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

      <div className="flex flex-grow flex-col gap-1 whitespace-nowrap">
        <span className="text-xs">Secondary</span>
        <Select
          value={secondary}
          onValueChange={(value) => setFilter('secondary', value)}
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

      <div className="flex flex-grow flex-col gap-1 whitespace-nowrap">
        <span className="text-xs">Association Measure</span>
        <Select
          disabled={!isSortable}
          value={ccSortBy}
          onValueChange={(value) =>
            setFilter('ccSortBy', FilterSchema.shape.ccSortBy.parse(value))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Association Measure" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
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
  const {
    isSortable,
    clSortByOffset,
    clSortOrder,
    clFilterItem,
    clFilterItemPAtt,
    primary,
    pAttributes,
    setFilter,
  } = useFilterSelection('/_app/constellations_/$constellationId')

  return (
    <div className={cn('z-10 mb-8 grid grid-cols-6 gap-2', className)}>
      <div className="col-span-2 flex flex-grow flex-col gap-1 whitespace-nowrap">
        <span className="text-sm">Filter Discoursemes</span>
        <FilterDiscoursemes />
      </div>

      <div className="flex flex-grow flex-col gap-1 whitespace-nowrap">
        <span className="text-sm">Sort By Offset {clSortByOffset}</span>
        <SortByOffset
          value={clSortByOffset ?? 0}
          onChange={(newValue) => setFilter('clSortByOffset', newValue)}
          disabled={!isSortable}
        />
      </div>

      <div className="flex flex-grow flex-col gap-1 whitespace-nowrap">
        <span className="text-sm">Sort Order</span>
        <Select
          value={clSortOrder}
          onValueChange={(value) =>
            setFilter(
              'clSortOrder',
              FilterSchema.shape.clSortOrder.parse(value),
            )
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Sort Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {['ascending', 'descending', 'random', 'first'].map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-grow flex-col gap-1 whitespace-nowrap">
        <span className="text-sm">Primary</span>
        <Select
          value={primary}
          onValueChange={(value) => setFilter('primary', value)}
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

      <div className="flex flex-grow flex-col gap-1 whitespace-nowrap">
        <span className="text-sm">
          Filter Item {clFilterItemPAtt && `(on ${clFilterItemPAtt})`}
        </span>
        <div className="flex flex-grow gap-1">
          <div className="bg-muted flex min-h-6 flex-grow items-center rounded px-2">
            {clFilterItem}
          </div>
          {clFilterItem !== '' && (
            <Button
              variant="secondary"
              onClick={() => setFilter('clFilterItem', '')}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterDiscoursemes() {
  const { setFilter, clFilterDiscoursemeIds } = useFilterSelection(
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
      onChange={(ids) => setFilter('clFilterDiscoursemeIds', ids)}
      disabled={isLoading || Boolean(error)}
      className={cn(
        isLoading && 'animate-pulse',
        Boolean(error) && 'text-destructive-foreground',
      )}
    />
  )
}

import { useSearch } from '@tanstack/react-router'
import { FilterIcon } from 'lucide-react'

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  FilterSchema,
  useFilterSelection,
} from '@/routes/_app/constellations_/$constellationId/-use-filter-selection'
import { ButtonTooltip } from '@/components/button-tooltip'

// TODO: Unify this with -query-filter.tsx
export function ConstellationCollocationFilter({
  className,
}: {
  className?: string
}) {
  const searchParams = useSearch({
    from: '/_app/constellations/$constellationId',
  })
  const corpusId = searchParams.corpusId
  const {
    isSortable,
    windowSize,
    clFilterItem,
    ccFilterItem,
    ccSortOrder,
    s,
    secondary,
    setFilter,
    pAttributes,
    contextBreakList,
    ccSortBy,
  } = useFilterSelection('/_app/constellations/$constellationId', corpusId)

  return (
    <div className={cn('z-10 mb-8 grid grid-cols-8 gap-2', className)}>
      <div className="flex flex-grow flex-col gap-1 whitespace-nowrap">
        <span className="text-sm">Window Size {windowSize}</span>
        <Slider
          defaultValue={[windowSize]}
          onValueChange={([newValue]) => setFilter('windowSize', newValue)}
          min={0}
          max={24}
          className="my-auto"
        />
      </div>

      <div className="flex flex-grow flex-col gap-1 whitespace-nowrap">
        <span className="text-sm">Context Break</span>
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
        <span className="text-sm">Secondary</span>
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
        <span className="text-sm">
          Filter Item TODO: cc/cl
          {ccFilterItem !== clFilterItem && (
            <ButtonTooltip
              size="sm"
              onClick={() => setFilter('ccFilterItem', clFilterItem)}
              className="ml-2 h-auto py-1 text-xs"
              variant="secondary"
              tooltip="Create new collocation analysis with this filter item"
            >
              <FilterIcon className="h-3 w-3" />
            </ButtonTooltip>
          )}
        </span>
        <Input
          defaultValue={clFilterItem}
          key={clFilterItem}
          onChange={(event) =>
            setFilter('clFilterItem', event.target.value ?? '')
          }
        />
      </div>

      <div className="flex flex-grow flex-col gap-1 whitespace-nowrap">
        <span className="text-sm">Sort by</span>
        <Select
          disabled={!isSortable}
          value={ccSortBy}
          onValueChange={(value) =>
            setFilter('ccSortBy', FilterSchema.shape.ccSortBy.parse(value))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
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
      <div className="flex flex-grow flex-col gap-1 whitespace-nowrap">
        <span className="text-sm">Sort Order</span>
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
    </div>
  )
}

export function ConstellationConcordanceFilter({
  className,
}: {
  className?: string
}) {
  const searchParams = useSearch({
    from: '/_app/constellations/$constellationId',
  })
  const corpusId = searchParams.corpusId
  const {
    isSortable,
    clSortByOffset,
    clSortOrder,
    clFilterItem,
    ccFilterItem,
    primary,
    setFilter,
    pAttributes,
  } = useFilterSelection('/_app/constellations/$constellationId', corpusId)

  return (
    <div className={cn('z-10 mb-8 grid grid-cols-8 gap-2', className)}>
      <div className="flex flex-grow flex-col gap-1 whitespace-nowrap">
        <span className="text-sm">Sort By Offset {clSortByOffset}</span>
        <Slider
          disabled={!isSortable}
          defaultValue={[clSortByOffset ?? 0]}
          onValueChange={([newValue]) => setFilter('clSortByOffset', newValue)}
          min={-5}
          max={5}
          className="my-auto"
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
          Filter Item TODO: cl/cc
          {ccFilterItem !== clFilterItem && (
            <ButtonTooltip
              size="sm"
              onClick={() => setFilter('ccFilterItem', clFilterItem)}
              className="ml-2 h-auto py-1 text-xs"
              variant="secondary"
              tooltip="Create new collocation analysis with this filter item"
            >
              <FilterIcon className="h-3 w-3" />
            </ButtonTooltip>
          )}
        </span>
        <Input
          defaultValue={clFilterItem}
          key={clFilterItem}
          onChange={(event) =>
            setFilter('clFilterItem', event.target.value ?? '')
          }
        />
      </div>
    </div>
  )
}

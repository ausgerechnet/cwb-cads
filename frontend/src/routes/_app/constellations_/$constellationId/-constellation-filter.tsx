import { useSearch } from '@tanstack/react-router'

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectValue,
} from '@/components/ui/select.tsx'
import { Slider } from '@/components/ui/slider.tsx'
import { cn } from '@/lib/utils.ts'
import { Input } from '@/components/ui/input.tsx'
import {
  FilterSchema,
  useFilterSelection,
} from '@/routes/_app/constellations_/$constellationId/-use-filter-selection.ts'

// TODO: Unify this with -query-filter.tsx
export function ConstellationFilter({ className }: { className?: string }) {
  const searchParams = useSearch({
    from: '/_app/constellations/$constellationId',
  })
  const corpusId = searchParams.corpusId
  const {
    windowSize,
    clSortByOffset,
    clSortOrder,
    filterItem,
    s,
    secondary,
    primary,
    setFilter,
    pAttributes,
    contextBreakList,
    ccSortBy,
  } = useFilterSelection('/_app/constellations/$constellationId', corpusId)

  return (
    <div className={cn('z-10 mb-8 grid grid-cols-8 gap-2', className)}>
      <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
        <span>Window Size {windowSize}</span>
        <Slider
          defaultValue={[windowSize]}
          onValueChange={([newValue]) => setFilter('windowSize', newValue)}
          min={0}
          max={24}
          className="my-auto"
        />
      </div>
      <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
        <span>Sort By Offset {clSortByOffset}</span>
        <Slider
          defaultValue={[clSortByOffset]}
          onValueChange={([newValue]) => setFilter('clSortByOffset', newValue)}
          min={-5}
          max={5}
          className="my-auto"
        />
      </div>

      <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
        <span>Sort Order</span>
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
        <span>Context Break</span>
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

      <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
        <span>Primary</span>
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

      <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
        <span>Secondary</span>
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

      <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
        <span>Filter Item</span>
        <Input
          defaultValue={filterItem}
          key={filterItem}
          onChange={(event) =>
            setFilter('filterItem', event.target.value ?? '')
          }
        />
      </div>

      <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
        <span>Sort by</span>
        <Select
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
    </div>
  )
}

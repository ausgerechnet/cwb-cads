import { LabelBox } from '../label-box'
import { Slider } from '../ui/slider'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

import { useConcordanceFilterContext } from './concordance-context'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Input } from '../ui/input'
import { XIcon } from 'lucide-react'
import { ToggleBar } from '../toggle-bar'

export function WindowSizeInput({ className }: { className?: string }) {
  const { windowSize, setWindowSize } = useConcordanceFilterContext()
  return (
    <LabelBox className={className} labelText={`Window size ${windowSize}`}>
      <Slider
        defaultValue={[windowSize]}
        onValueChange={([newValue]) => setWindowSize(newValue)}
        min={0}
        max={24}
        className="my-auto"
      />
    </LabelBox>
  )
}

export function SortByOffsetInput({
  className,
  offsets = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5],
}: {
  className?: string
  offsets?: number[]
}) {
  const { clSortByOffset, setSortByOffset, clSortOrder } =
    useConcordanceFilterContext()
  return (
    <LabelBox
      className={className}
      labelText={`Sort by offset ${clSortByOffset}`}
    >
      <div className={cn('flex flex-grow items-center', className)}>
        {offsets.map((offset) => (
          <Button
            key={offset}
            onClick={() => setSortByOffset(offset)}
            className="flex h-10 flex-grow flex-col rounded-none p-1 text-sm leading-none first:rounded-bl-md first:rounded-tl-md last:rounded-br-md last:rounded-tr-md"
            disabled={clSortOrder === 'random' || clSortOrder === 'first'}
            variant={offset === clSortByOffset ? 'default' : 'secondary'}
            size="sm"
          >
            <span className="-mt-1 block h-3 text-xs leading-none">
              {offset < 0 ? '-' : offset > 0 ? '+' : ''}
            </span>
            <span>{Math.abs(offset)}</span>
          </Button>
        ))}
      </div>
    </LabelBox>
  )
}

export function SortOrderInput({ className }: { className?: string }) {
  const { clSortOrder, setSortOrder } = useConcordanceFilterContext()
  return (
    <LabelBox className={className} labelText="Sort Order">
      <ToggleBar
        value={clSortOrder}
        options={[
          ['ascending', 'Asc'],
          ['descending', 'Desc'],
          ['random', 'Rand'],
          ['first', 'First'],
        ]}
        onChange={setSortOrder}
      />
    </LabelBox>
  )
}

export function ContextBreakInput({ className }: { className?: string }) {
  const { clContextBreak, setContextBreak, structureAttributes } =
    useConcordanceFilterContext()
  return (
    <LabelBox className={className} labelText="Context Break">
      <Select
        value={clContextBreak}
        onValueChange={(value) => setContextBreak(value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Filter Item PAttr" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {structureAttributes.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </LabelBox>
  )
}

export function FilterItemInput({ className }: { className?: string }) {
  const {
    clFilterItem = '',
    setFilterItem,
    clFilterItemPAtt,
  } = useConcordanceFilterContext()
  return (
    <LabelBox
      className={className}
      labelText={`Filter Item${clFilterItemPAtt ? ` (on ${clFilterItemPAtt})` : ''}`}
    >
      <div className="flex gap-1">
        <Input
          readOnly
          value={clFilterItem}
          onChange={(event) =>
            setFilterItem(event.target.value, clFilterItemPAtt!)
          }
          placeholder="Filter Item"
        />

        {clFilterItem && (
          <Button
            onClick={() => setFilterItem(undefined, clFilterItemPAtt!)}
            variant="secondary"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </LabelBox>
  )
}

export function FilterItemLayerInput({ className }: { className?: string }) {
  const { clFilterItemPAtt, clFilterItem, setFilterItem, layers } =
    useConcordanceFilterContext()
  return (
    <LabelBox
      className={className}
      labelText={`Filter Item Layer ${clFilterItemPAtt}`}
    >
      <Select
        value={clFilterItemPAtt}
        onValueChange={(layer) => setFilterItem(clFilterItem, layer)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Filter Item" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {layers.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </LabelBox>
  )
}

export function PrimaryInput({ className }: { className?: string }) {
  const { primary, setPrimary, layers } = useConcordanceFilterContext()
  return (
    <LabelBox className={className} labelText="Primary">
      <Select value={primary} onValueChange={(value) => setPrimary(value)}>
        <SelectTrigger>
          <SelectValue placeholder="Primary" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {layers.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </LabelBox>
  )
}

export function SecondaryInput({ className }: { className?: string }) {
  const { secondary, setSecondary, layers } = useConcordanceFilterContext()
  return (
    <LabelBox className={className} labelText="Secondary">
      <Select value={secondary} onValueChange={(value) => setSecondary(value)}>
        <SelectTrigger>
          <SelectValue placeholder="Primary" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {layers.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </LabelBox>
  )
}

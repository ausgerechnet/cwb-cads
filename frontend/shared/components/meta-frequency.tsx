import { CheckSquareIcon, SquareIcon } from 'lucide-react'

import { cn } from '../lib/utils'
import { formatNumber } from '../lib/format-number'
import { ErrorMessage } from './error-message'
import { GraphRange, XAxisVertical } from './graph'
import { RangeSlider } from './range-slider'
import { ComplexSelect } from './select-complex'
import { Input } from './ui/input'

export function MetaFrequencyNumericInput({
  className,
  frequencies,
  onChange,
  value,
}: {
  className?: string
  frequencies: Frequency<number>[]
  onChange?: (range: [number, number]) => void
  value: [number, number]
}) {
  const [min, max] = [
    Math.min(...frequencies.map((f) => f.value)),
    Math.max(...frequencies.map((f) => f.value)),
  ]
  const [selectedTokensTotal, selectedSpansTotal, tokensTotal, spansTotal] =
    frequencies.reduce(
      (acc, point) => {
        if (point.value >= value[0] && point.value <= value[1]) {
          acc[0] += point.nrTokens
          acc[1] += point.nrSpans
        }
        acc[2] += point.nrTokens
        acc[3] += point.nrSpans
        return acc
      },
      [0, 0, 0, 0],
    )

  return (
    <div className={cn('bg-muted rounded-lg p-2', className)}>
      <GraphRange
        dataPoints={frequencies.map((f) => ({
          position: [f.value, f.nrTokens] satisfies [number, number],
        }))}
        pointStyle="bar"
        viewportY={[0]}
        value={value}
      />

      <RangeSlider
        min={min}
        max={max}
        value={value}
        onChange={onChange}
        className="mt-8"
      />

      <div className="grid grid-cols-[auto_auto_auto_1fr] gap-2">
        <Input
          type="number"
          min={min}
          max={max}
          value={value[0]}
          onChange={(event) => {
            if (!(event.target as HTMLInputElement).validity.valid) return
            const newValue = parseFloat(event.target.value)
            if (isNaN(newValue)) return
            onChange?.([newValue, value[1]].toSorted() as [number, number])
          }}
        />

        <span className="my-auto">—</span>

        <Input
          type="number"
          min={min}
          max={max}
          value={value[1]}
          onChange={(event) => {
            if (!(event.target as HTMLInputElement).validity.valid) return
            const newValue = parseFloat(event.target.value)
            if (isNaN(newValue)) return
            onChange?.([value[0], newValue].toSorted() as [number, number])
          }}
        />

        <div className="text-muted-foreground my-auto text-sm leading-tight">
          {formatNumber(selectedTokensTotal)} / {formatNumber(tokensTotal)}{' '}
          Tokens
          <br />
          {formatNumber(selectedSpansTotal)} / {formatNumber(spansTotal)} Spans
        </div>
      </div>
    </div>
  )
}

export function MetaFrequencyDatetimeInput({
  className,
  frequencies,
  // timeInterval,
  onChange,
  value,
}: {
  className?: string
  frequencies: Frequency<string>[]
  timeInterval?: 'hour' | 'day' | 'week' | 'month' | 'year'
  onChange?: (range: [string, string]) => void
  value: [string, string]
}) {
  const rangeData = frequencies.map((f) => {
    const value = new Date(f.value).getTime()
    if (isNaN(value)) {
      console.error('Invalid date:', f.value)
    }
    return {
      originalValue: f.value,
      value,
      occurrences: f.nrTokens,
    }
  })
  const indexValue: [number, number] = [
    frequencies.findIndex((f) => f.value === value[0]),
    frequencies.findIndex((f) => f.value === value[1]),
  ]
  function handleChange(newValue: [string, string]) {
    const newIndexValue: [number, number] = [
      frequencies.findIndex((f) => f.value === newValue[0]),
      frequencies.findIndex((f) => f.value === newValue[1]),
    ]
    if (newIndexValue[0] > newIndexValue[1]) {
      ;[newValue[0], newValue[1]] = [newValue[1], newValue[0]]
    }
    onChange?.(newValue)
  }

  if (
    rangeData.some((d) => isNaN(d.value)) ||
    indexValue.some((d) => d === -1)
  ) {
    const invalidData = rangeData
      .filter((d) => isNaN(d.value))
      .map((d) => d.originalValue)
      .join(', ')
    return <ErrorMessage error={new Error(`${invalidData} is invalid`)} />
  }

  const [selectedTokensTotal, selectedSpansTotal, tokensTotal, spansTotal] =
    frequencies.reduce(
      (acc, point) => {
        if (point.value >= value[0] && point.value <= value[1]) {
          acc[0] += point.nrTokens
          acc[1] += point.nrSpans
        }
        acc[2] += point.nrTokens
        acc[3] += point.nrSpans
        return acc
      },
      [0, 0, 0, 0],
    )

  const selectItems = frequencies.map(({ value }, index) => ({
    id: index,
    name: value,
    searchValue: value,
  }))

  return (
    <>
      <div className={cn('bg-muted rounded-lg p-2', className)}>
        <GraphRange
          graphClassName="h-[28rem]"
          dataPoints={frequencies.map(({ value, nrTokens }, index) => ({
            // Mapping the index onto the x-axis
            position: [index, nrTokens] satisfies [number, number],
            label: value,
          }))}
          pointStyle="bar"
          viewportY={[0]}
          value={indexValue}
          XAxisComponent={XAxisVertical}
        />

        <RangeSlider
          min={0}
          max={frequencies.length - 1}
          value={indexValue}
          className="mt-8"
          onChange={([minIndex, maxIndex]) => {
            handleChange([
              frequencies[minIndex].value,
              frequencies[maxIndex].value,
            ])
          }}
        />

        <div className="grid grid-cols-[auto_auto_auto_1fr] gap-2">
          <ComplexSelect
            items={selectItems}
            itemId={indexValue[0]}
            emptyMessage="Select start time"
            selectMessage="Select start time"
            onChange={(itemId) => {
              if (itemId !== undefined) {
                handleChange([
                  frequencies[itemId].value,
                  frequencies[indexValue[1]].value,
                ])
              }
            }}
          />

          <span className="my-auto">—</span>

          <ComplexSelect
            items={selectItems}
            itemId={indexValue[1]}
            emptyMessage="Select start time"
            selectMessage="Select start time"
            onChange={(itemId) => {
              if (itemId !== undefined) {
                handleChange([
                  frequencies[indexValue[0]].value,
                  frequencies[itemId].value,
                ])
              }
            }}
          />

          <div className="text-muted-foreground my-auto text-sm leading-tight">
            {formatNumber(selectedTokensTotal)} / {formatNumber(tokensTotal)}{' '}
            Tokens
            <br />
            {formatNumber(selectedSpansTotal)} / {formatNumber(spansTotal)}{' '}
            Spans
          </div>
        </div>
      </div>
    </>
  )
}

export const MetaFrequencyBooleanInput = MetaFrequencyUnicodeInput<
  boolean | null
>

export function MetaFrequencyUnicodeInput<
  T extends string | number | boolean | null | undefined,
>({
  className,
  frequencies,
  value = [],
  onChange,
  showBars = 'both',
}: {
  className?: string
  frequencies: Frequency<T>[]
  value: T[]
  onChange?: (values: T[]) => void
  showBars?: 'tokens' | 'spans' | 'both'
}) {
  const maxNrTokens = Math.max(...frequencies.map((f) => f.nrTokens))
  const maxNrSpans = Math.max(...frequencies.map((f) => f.nrSpans))
  return (
    <ul
      className={cn(
        'grid grid-cols-[min-content_auto_minmax(50%,1fr)] gap-1',
        className,
      )}
    >
      {frequencies.map(
        ({ value: frequencyValue, nrTokens, nrSpans }, index) => (
          <li key={index} className="col-span-full grid grid-cols-subgrid">
            <label className="group/check focus-within:ring-primary has-[:checked]:bg-primary/10 col-span-full grid w-full cursor-pointer select-none grid-cols-subgrid gap-x-1 gap-y-0.5 rounded-md p-1 text-left leading-none focus-within:ring-2 hover:bg-slate-100 dark:hover:bg-slate-900">
              <input
                type="checkbox"
                name="meta-frequencies"
                className="sr-only"
                checked={value.includes(frequencyValue)}
                onChange={(e) => {
                  if (onChange) {
                    onChange(
                      e.target.checked
                        ? [...value, frequencyValue]
                        : value.filter((v) => v !== frequencyValue),
                    )
                  }
                }}
              />

              <div className="row-span-2 grid px-1">
                <CheckSquareIcon className="text-primary cale-50 col-start-1 row-start-1 my-auto h-4 w-4 opacity-0 transition group-has-[:checked]/check:scale-100 group-has-[:checked]/check:opacity-100" />
                <SquareIcon className="col-start-1 row-start-1 m-auto h-4 w-4 scale-100 text-gray-500 opacity-100 transition group-has-[:checked]/check:scale-50 group-has-[:checked]/check:opacity-0" />
              </div>

              <div className="text-foreground letter-spacing-wide row-span-2 my-auto flex gap-1 opacity-90 group-has-[:checked]/check:opacity-100">
                {renderFrequencyValue(frequencyValue)}
              </div>

              {(
                [
                  {
                    type: 'tokens',
                    width: nrTokens / maxNrTokens,
                    unit: 'Tokens',
                    count: nrTokens,
                  },
                  {
                    type: 'spans',
                    width: nrSpans / maxNrSpans,
                    unit: 'Spans',
                    count: nrSpans,
                  },
                ] as const
              )
                .filter(({ type }) => showBars === 'both' || showBars === type)
                .map(({ width, unit, count }) => (
                  <div
                    className="col-span-1 col-start-3 my-auto flex flex-col gap-1 leading-[0]"
                    key={unit}
                  >
                    <div
                      style={{ width: `${width * 100}%` }}
                      className="bg-foreground col-start-1 row-start-1 my-auto h-5 min-w-0.5 rounded bg-slate-800 p-0.5 px-2 transition-colors group-hover/check:bg-black dark:bg-slate-300 dark:group-hover/check:bg-white"
                    >
                      <span className="whitespace-pre text-xs text-white mix-blend-difference">
                        {formatNumber(count)} {unit}
                      </span>
                    </div>
                  </div>
                ))}
            </label>
          </li>
        ),
      )}
    </ul>
  )
}

function renderFrequencyValue(
  value: string | number | boolean | undefined | null,
) {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return formatNumber(value)
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  if (value === null) return 'Null'
  return 'Undefined'
}

type Frequency<T> = {
  value: T
  nrSpans: number
  nrTokens: number
}

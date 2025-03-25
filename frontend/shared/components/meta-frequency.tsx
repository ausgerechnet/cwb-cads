import {
  CheckCircleIcon,
  CheckSquareIcon,
  CircleIcon,
  SquareIcon,
} from 'lucide-react'

import { cn } from '../lib/utils'
import { formatNumber } from '../lib/format-number'
import GraphRangeInput from './graph-range-input'
import { ErrorMessage } from './error-message'

export function MetaFrequencyNumericInput({
  className,
  frequencies,
  onChange,
}: {
  className?: string
  frequencies: Frequency<number>[]
  onChange?: (range: [[number, number]]) => void
}) {
  const rangeData = frequencies.map((f) => ({
    value: f.value,
    occurrences: f.nrTokens,
  }))

  return (
    <GraphRangeInput
      snapToData
      data={rangeData}
      className={className}
      onChange={(min, max) => onChange?.([[min, max]])}
    />
  )
}

export function MetaFrequencyDatetimeInput({
  className,
  frequencies,
  timeInterval,
  onChange,
}: {
  className?: string
  frequencies: Frequency<string>[]
  timeInterval: 'hour' | 'day' | 'week' | 'month' | 'year'
  onChange?: (range: [[string, string]]) => void
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

  if (rangeData.some((d) => isNaN(d.value))) {
    const invalidData = rangeData
      .filter((d) => isNaN(d.value))
      .map((d) => d.originalValue)
      .join(', ')
    return <ErrorMessage error={new Error(`${invalidData} is invalid`)} />
  }

  return (
    <GraphRangeInput
      key={timeInterval}
      snapToData
      data={rangeData}
      className={className}
      renderValue={renderValue}
      onChange={(min, max) => {
        function trimZ(time: string) {
          if (time.endsWith('Z')) return time.slice(0, -1)
          return time
        }
        onChange?.([
          [
            trimZ(new Date(min).toISOString()),
            trimZ(new Date(max).toISOString()),
          ],
        ])
      }}
    />
  )
}

function renderValue(value: number) {
  const intl = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  })
  return intl.format(value)
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

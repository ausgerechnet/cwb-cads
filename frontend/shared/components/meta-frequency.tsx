import {
  CheckCircleIcon,
  CheckSquareIcon,
  CircleIcon,
  SquareIcon,
} from 'lucide-react'

import { cn } from '../lib/utils'
import { formatNumber } from '../lib/format-number'
import GraphRangeInput from './graph-range-input'

export function MetaFrequencyNumericInput({
  className,
  frequencies,
}: {
  className?: string
  frequencies: Frequency<number>[]
}) {
  const rangeData = frequencies.map((f) => ({
    value: f.value,
    occurrences: f.nrTokens,
  }))

  return <GraphRangeInput snapToData data={rangeData} className={className} />
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
  onChange?: (range: [string, string]) => void
}) {
  const rangeData = frequencies.map((f) => ({
    value: new Date(f.value).getTime(),
    occurrences: f.nrTokens,
  }))

  return (
    <GraphRangeInput
      key={timeInterval}
      snapToData
      data={rangeData}
      className={className}
      renderValue={renderValue}
      onChange={(min, max) => {
        onChange?.([new Date(min).toISOString(), new Date(max).toISOString()])
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

export function MetaFrequencyBooleanInput({
  className,
  frequencies,
}: {
  className?: string
  frequencies: Frequency<boolean>[]
}) {
  const maxNrTokens = Math.max(...frequencies.map((f) => f.nrTokens))
  return (
    <ul
      className={cn(
        'grid grid-cols-[min-content_auto_minmax(50%,1fr)] gap-1',
        className,
      )}
    >
      {frequencies.map(({ value, nrTokens }) => (
        <li
          key={value ? 'y' : 'n'}
          className="col-span-full grid grid-cols-subgrid"
        >
          <label className="group/check focus-within:ring-primary has-[:checked]:bg-primary/10 col-span-full grid w-full cursor-pointer select-none grid-cols-subgrid gap-x-1 gap-y-0.5 rounded-md p-1 text-left leading-none focus-within:ring-2 hover:bg-slate-100 dark:hover:bg-slate-900">
            <input type="radio" name="meta-frequencies" className="sr-only" />

            <div className="row-span-2 grid px-1">
              <CheckCircleIcon className="text-primary cale-50 col-start-1 row-start-1 my-auto h-4 w-4 opacity-0 transition group-has-[:checked]/check:scale-100 group-has-[:checked]/check:opacity-100" />
              <CircleIcon className="col-start-1 row-start-1 m-auto h-4 w-4 scale-100 text-gray-500 opacity-100 transition group-has-[:checked]/check:scale-50 group-has-[:checked]/check:opacity-0" />
            </div>

            <div className="text-foreground letter-spacing-wide my-auto flex gap-1 opacity-90 group-has-[:checked]/check:opacity-100">
              {value ? 'true' : 'false'}
            </div>

            <div className="my-auto flex flex-col gap-1 leading-[0]">
              <div
                style={{ width: `${(nrTokens / maxNrTokens) * 100}%` }}
                className="bg-foreground col-start-1 row-start-1 my-auto h-5 min-w-0.5 rounded bg-slate-800 p-0.5 px-2 transition-colors group-hover/check:bg-black dark:bg-slate-300 dark:group-hover/check:bg-white"
              >
                <span className="whitespace-pre text-xs text-white mix-blend-difference">
                  {formatNumber(nrTokens)} Tokens
                </span>
              </div>
            </div>
          </label>
        </li>
      ))}
    </ul>
  )
}

export function MetaFrequencyUnicodeInput({
  className,
  frequencies,
  value = [],
  onChange,
}: {
  className?: string
  frequencies: Frequency<string>[]
  value: string[]
  onChange?: (values: string[]) => void
}) {
  const maxNrTokens = Math.max(...frequencies.map((f) => f.nrTokens))
  return (
    <ul
      className={cn(
        'grid grid-cols-[min-content_auto_minmax(50%,1fr)] gap-1',
        className,
      )}
    >
      {frequencies.map(({ value: frequencyValue, nrTokens }) => (
        <li
          key={frequencyValue}
          className="col-span-full grid grid-cols-subgrid"
        >
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

            <div className="text-foreground letter-spacing-wide my-auto flex gap-1 opacity-90 group-has-[:checked]/check:opacity-100">
              {frequencyValue}
            </div>

            <div className="my-auto flex flex-col gap-1 leading-[0]">
              <div
                style={{ width: `${(nrTokens / maxNrTokens) * 100}%` }}
                className="bg-foreground col-start-1 row-start-1 my-auto h-5 min-w-0.5 rounded bg-slate-800 p-0.5 px-2 transition-colors group-hover/check:bg-black dark:bg-slate-300 dark:group-hover/check:bg-white"
              >
                <span className="whitespace-pre text-xs text-white mix-blend-difference">
                  {formatNumber(nrTokens)} Tokens
                </span>
              </div>
            </div>
          </label>
        </li>
      ))}
    </ul>
  )
}

type Frequency<T> = {
  value: T
  nrSpans: number
  nrTokens: number
}

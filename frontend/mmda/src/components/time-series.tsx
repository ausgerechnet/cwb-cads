import { cn } from '@cads/shared/lib/utils'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cads/shared/components/ui/select'
import { GraphRange } from '@cads/shared/components/graph'

export function TimeSeries({
  className,
  value,
  data,
  onChange,
}: {
  className?: string
  value?: string
  onChange?: (value: string) => void
  data: {
    score?: number // 0-1
    label?: string
    median: number
    confidence90: [number, number]
    confidence95: [number, number]
  }[]
}) {
  return (
    <div
      className={cn(
        'bg-muted relative grid grid-cols-[4rem_1fr_3rem] grid-rows-[15rem_1fr] overflow-hidden rounded-lg border',
        className,
      )}
    >
      <GraphRange
        bands={[
          {
            points: data.map(
              ({ confidence95 }, index) =>
                [index, confidence95] satisfies [number, [number, number]],
            ),
            className: 'fill-slate-300 dark:fill-slate-700',
          },
          {
            points: data.map(
              ({ confidence90 }, index) =>
                [index, confidence90] satisfies [number, [number, number]],
            ),
            className: 'fill-slate-400 dark:fill-slate-600',
          },
        ]}
        lines={[
          data.map(
            ({ median }, index) => [index, median] satisfies [number, number],
          ),
        ]}
        dataPoints={data
          .map(({ label, score }, index) =>
            score === undefined
              ? null
              : {
                  position: [index, score] satisfies [number, number],
                  label,
                },
          )
          .filter((d) => d !== null)}
        onChange={(_, label) => {
          if (label === undefined) {
            throw new Error('Invalid data format')
          }
          onChange?.(label)
        }}
        value={data.findIndex((d) => d.label === value)}
        className="col-span-3 w-full"
      />

      <div className="bg-muted relative col-span-full col-start-1 pt-2">
        <Select
          value={value}
          onValueChange={onChange}
          disabled={
            !onChange ||
            data.every((d) => d.label === undefined || d.score === undefined)
          }
        >
          <SelectTrigger className="mx-2 mb-2 w-auto">
            <SelectValue placeholder="Select Entry" />
          </SelectTrigger>

          <SelectContent>
            <SelectGroup>
              {data.map(({ label, score }) =>
                label === undefined || score === undefined ? null : (
                  <SelectItem key={label} value={label}>
                    {label}: {score}
                  </SelectItem>
                ),
              )}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

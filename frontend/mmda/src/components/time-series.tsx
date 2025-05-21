import { z } from 'zod'
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
import { schemas } from '@/rest-client'

type Data = Pick<
  z.infer<typeof schemas.UFAScoreOut>,
  'score_confidence' | 'score' | 'x_label'
>[]

export function TimeSeries({
  className,
  value,
  data,
  onChange,
}: {
  className?: string
  value?: string
  onChange?: (value: string) => void
  data?: Data
}) {
  const values =
    data
      ?.map((d) => ({ x_label: d.x_label, score: d.score }))
      .filter(({ score }) => score !== null) ?? []
  const lines = dataToLines(data ?? [])
  const bands = dataToBands(data ?? [])
  const DataPoints = dataToPoints(data ?? [])

  return (
    <div
      className={cn(
        'bg-muted relative grid grid-cols-[4rem_1fr_3rem] grid-rows-[15rem_1fr] overflow-hidden rounded-lg border',
        className,
      )}
    >
      <GraphRange
        bands={bands}
        lines={lines}
        dataPoints={DataPoints}
        onChange={(_, label) => {
          if (label === undefined) {
            throw new Error('Invalid data format')
          }
          onChange?.(label)
        }}
        value={data?.findIndex((d) => d.x_label === value)}
        className="col-span-3 w-full px-2"
      />

      <div className="bg-muted relative col-span-full col-start-1 pt-2">
        <Select
          value={value}
          onValueChange={onChange}
          disabled={
            !onChange ||
            Boolean(
              data?.every(
                (d) => d.x_label === undefined || d.score === undefined,
              ),
            )
          }
        >
          <SelectTrigger className="mx-2 mb-2 w-auto">
            <SelectValue placeholder="Select Entry" />
          </SelectTrigger>

          <SelectContent>
            <SelectGroup>
              {values.map(({ x_label, score }) =>
                x_label === undefined || score === undefined ? null : (
                  <SelectItem key={x_label} value={x_label}>
                    {x_label}: {score}
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

function dataToLines(data: Data): [number, number][][] {
  const lines = group(
    data.map((d, index) => [index, d.score] satisfies [number, number | null]),
    (line): line is [number, number] => line[1] !== null,
  )
  return lines
}

function dataToBands(
  data: Data,
): { points: [number, [number, number]][]; className?: string }[] {
  function isValidBand(
    band: [number, [number | null, number | null]],
  ): band is [number, [number, number]] {
    return band[1][0] !== null && band[1][1] !== null
  }
  return [
    ...group(
      data.map(
        (d, index) =>
          [
            index,
            [d.score_confidence.lower_95, d.score_confidence.upper_95],
          ] satisfies [number, [number | null, number | null]],
      ),
      isValidBand,
    ).map((points) => ({
      points,
      className: 'fill-slate-400 dark:fill-slate-600',
    })),
    ...group(
      data.map(
        (d, index) =>
          [
            index,
            [d.score_confidence.lower_90, d.score_confidence.upper_90],
          ] satisfies [number, [number | null, number | null]],
      ),
      isValidBand,
    ).map((points) => ({
      points,
      className: 'fill-slate-300 dark:fill-slate-700',
    })),
  ]
}

function dataToPoints(data: Data) {
  return data
    .map((d, index) => ({
      position: [index, d.score] satisfies [number, number | null],
      label: `${d.x_label ?? index}`,
    }))
    .filter(
      (d): d is { position: [number, number]; label: string } =>
        d.position[1] !== null,
    )
}

function group<T, R extends T>(
  arr: T[],
  groupFn: (item: T) => item is R,
): R[][] {
  const result: R[][] = []
  let current: R[] = []

  for (const item of arr) {
    if (groupFn(item)) {
      current.push(item)
    } else {
      if (current.length > 0) {
        result.push(current)
        current = []
      }
    }
  }

  if (current.length > 0) {
    result.push(current)
  }

  return result
}

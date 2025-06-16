import { cn } from '@cads/shared/lib/utils'
import { Graph } from '@cads/shared/components/graph'
import { SelectSingle } from '@cads/shared/components/select-single'

export function CutOffSelect({
  value,
  onChange,
  className,
  options,
}: {
  value: number
  onChange: (decile: number) => void
  className?: string
  options: {
    decile: number
    score: number
    scaled_score: number
  }[]
}) {
  console.log('options', options)
  const score = options?.find((option) => option.decile === value)?.score
  console.log('score', score)

  const max = Math.max(...(options?.map((option) => option.scaled_score) ?? []))

  return (
    <div className={cn('flex gap-2', className)}>
      <div className="border-input group/cutoff bg-muted relative grid h-10 grow overflow-hidden rounded border-[1px]">
        {options
          .toSorted((a, b) => b.decile - a.decile)
          .map(({ decile, scaled_score }) => (
            <button
              key={decile}
              className="aria-selected:bg-primary aria-selected:border-r-primary hover:bg-primary/20 group-has-[button:hover]/cutoff:hover:bg-primary absolute left-0 h-full overflow-hidden group-has-[button:hover]/cutoff:opacity-0 group-has-[button:hover]/cutoff:hover:opacity-50 group-has-[button:hover]/cutoff:aria-selected:hover:opacity-70"
              aria-selected={decile === value}
              style={{
                width: `${(scaled_score / max) * 100}%`,
              }}
              onClick={() => onChange(decile)}
            />
          ))}

        {options.map(({ decile, scaled_score }) => (
          <span
            key={decile}
            className="border-muted-foreground/50 pointer-events-none absolute top-0 h-full border-r-[1px]"
            style={{
              left: `${(scaled_score / max) * 100}%`,
            }}
          />
        ))}

        <Graph
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible bg-transparent"
          hideLegend
          viewportY={[0]}
          viewportX={[0, max]}
          bands={[
            {
              points: [
                ...(options?.map(
                  ({ decile, scaled_score }): [number, [number, number]] => [
                    scaled_score,
                    [0, decile],
                  ],
                ) ?? []),
                [1, [0, 10]],
              ],
              className: 'dark:fill-white/50 fill-black/50',
            },
          ]}
        />
      </div>

      <SelectSingle
        className="w-32"
        value={options?.find((o) => o.decile === value)?.score.toString() ?? ''}
        onValueChange={(value) => {
          const decile = options?.find(
            (option) => option.score.toString() === value,
          )?.decile
          onChange(Number(decile))
        }}
        items={options?.map((o) => o.score.toString()) ?? []}
      />
    </div>
  )
}

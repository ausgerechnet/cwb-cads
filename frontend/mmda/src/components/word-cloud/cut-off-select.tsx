import * as Slider from '@radix-ui/react-slider'
import { cn } from '@cads/shared/lib/utils'
import { Graph } from '@cads/shared/components/graph'

export function CutOffSelect({
  value,
  onChange,
  className,
  options,
}: {
  value: number
  onChange: (scaled_score: number) => void
  className?: string
  options: {
    decile: number
    score: number
    scaled_score: number
  }[]
}) {
  return (
    <div
      className={cn(
        'border-input group/cutoff bg-muted relative grid h-10 grow gap-2 overflow-hidden rounded border-[1px]',
        className,
      )}
    >
      <Slider.Root
        className="relative flex h-full min-h-8 w-full cursor-pointer touch-none select-none items-center"
        min={0}
        max={1}
        step={0.0001}
        value={[value]}
        onValueChange={(value) => onChange(value[0])}
      >
        <Slider.Track className="h-full w-full">
          <Slider.Range className="bg-primary absolute h-full" />

          <Graph
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible bg-transparent"
            hideLegend
            viewportY={[0]}
            viewportX={[0, 1]}
            bands={[
              {
                points: [
                  [0, [0, 0]],
                  ...(
                    options.map(
                      ({
                        decile,
                        scaled_score,
                      }): [number, [number, number]] => [
                        1 - scaled_score,
                        [0, 10 - decile],
                      ],
                    ) ?? []
                  ).toReversed(),
                  [1, [0, 10]],
                ],
                className: 'dark:fill-white/50 fill-black/50',
              },
            ]}
          />
        </Slider.Track>

        <Slider.Thumb className="border-primary ring-offset-background focus-visible:ring-ring block h-6 w-2 rounded-full border-2 bg-white/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
      </Slider.Root>
    </div>
  )
}

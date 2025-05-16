import { ComponentProps, useState } from 'react'
import { Root, Track, Thumb } from '@radix-ui/react-slider'

import { cn } from '@cads/shared/lib/utils'

import { useViewport } from './use-viewport'
import { Graph } from './graph'

export function GraphRange({
  className,
  graphClassName,
  hideRange = false,
  ...props
}: ComponentProps<typeof Graph> & {
  graphClassName?: string
  hideRange?: boolean
}) {
  const [range, setRange] = useState([0, 1])

  const vp = useViewport(
    props.dataPoints,
    props.bands,
    props.lines,
    props.viewportX,
    props.viewportY,
    props.pointStyle,
  )

  const viewportX = (
    hideRange
      ? [vp.minX - vp.barWidth / 2, vp.maxX + vp.barWidth / 2]
      : [
          vp.minX + vp.valueRangeX * (1 - range[1]) - vp.barWidth / 2,
          vp.minX + vp.valueRangeX * (1 - range[0]) + vp.barWidth / 2,
        ]
  ) satisfies [number, number]

  return (
    <div
      className={cn(
        'border-border bg-muted relative flex flex-col overflow-hidden pt-5',
        className,
      )}
    >
      <Graph
        {...props}
        viewportX={viewportX}
        className={cn('grow pr-1', graphClassName)}
      />

      {!hideRange && (
        <div
          className={cn(
            'bg-muted-foreground/10 border-1 border-muted-foreground/10 relative mt-3 h-8 grow cursor-col-resize overflow-hidden rounded-md border',
            !vp.hasData && 'pointer-events-none opacity-0',
          )}
        >
          <Graph
            className="pointer-events-none absolute left-0 top-0 h-full w-full bg-transparent pt-0"
            {...props}
            viewportX={[vp.minX - vp.barWidth / 2, vp.maxX + vp.barWidth / 2]}
            hideLegend
          />

          <Root
            className="user-select-none absolute flex h-full w-full touch-none items-center"
            value={range}
            onValueChange={setRange}
            min={0}
            max={1}
            step={0.001}
            inverted
          >
            <Track className="relative h-full w-full">
              <div
                className="absolute right-0 h-full bg-black/20 dark:bg-black/40"
                style={{ width: `${range[0] * 100}%` }}
              />

              <div
                className="absolute left-0 h-full bg-black/20 dark:bg-black/40"
                style={{ width: `${100 - range[1] * 100}%` }}
              />
            </Track>

            <Thumb className="bg-foreground/50 block h-6 w-1 rounded-lg" />

            <Thumb className="bg-foreground/50 block h-6 w-1 rounded-lg" />
          </Root>
        </div>
      )}
    </div>
  )
}

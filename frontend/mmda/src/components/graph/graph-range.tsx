import { ComponentProps, useState } from 'react'
import { Root, Track, Thumb } from '@radix-ui/react-slider'

import { cn } from '@cads/shared/lib/utils'

import { useViewport } from './use-viewport'
import { Graph } from './graph'

export function GraphRange({
  className,
  ...props
}: ComponentProps<typeof Graph>) {
  const [range, setRange] = useState([0, 1])

  const vp = useViewport(
    props.dataPoints,
    props.bands,
    props.lines,
    props.viewportX,
    props.viewportY,
    props.pointStyle,
  )

  const viewportX = [
    vp.minX + vp.valueRangeX * (1 - range[1]) - vp.barWidth / 2,
    vp.minX + vp.valueRangeX * (1 - range[0]) + vp.barWidth / 2,
  ] as [number, number]

  return (
    <div
      className={cn(
        'border-border bg-muted relative overflow-hidden rounded-lg pt-5',
        className,
      )}
    >
      <Graph {...props} viewportX={viewportX} className="pr-1" />

      <div className="bg-muted-foreground/10 border-1 border-muted-foreground/10 relative m-1 mt-5 h-14 overflow-hidden rounded-md border">
        <Graph
          className="absolute left-0 top-0 h-full w-full bg-transparent pt-2"
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

          <Thumb className="bg-foreground/50 block h-8 w-1 rounded-lg" />

          <Thumb className="bg-foreground/50 block h-8 w-1 rounded-lg" />
        </Root>
      </div>
    </div>
  )
}

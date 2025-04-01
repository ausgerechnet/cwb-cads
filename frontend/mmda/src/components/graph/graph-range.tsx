import { ComponentProps, useState } from 'react'
import { Root, Track, Thumb } from '@radix-ui/react-slider'

import { cn } from '@cads/shared/lib/utils'

import { Graph } from '.'
import { useViewport } from './use-viewport'

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
        'border-border bg-muted relative overflow-hidden rounded-lg',
        className,
      )}
    >
      <Graph {...props} viewportX={viewportX} />

      <div className="border-t-background bg-muted-foreground/10 relative h-20 w-full border-t">
        <Graph
          className="absolute left-0 top-0 h-full w-full bg-transparent"
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
              className="dark:bg-muted/70 absolute right-0 h-full bg-black/20"
              style={{ width: `${range[0] * 100}%` }}
            />

            <div
              className="dark:bg-muted/70 absolute left-0 h-full bg-black/20"
              style={{ width: `${100 - range[1] * 100}%` }}
            />
          </Track>

          <Thumb className="bg-foreground/50 block h-16 w-1 rounded-lg" />

          <Thumb className="bg-foreground/50 block h-16 w-1 rounded-lg" />
        </Root>
      </div>
    </div>
  )
}

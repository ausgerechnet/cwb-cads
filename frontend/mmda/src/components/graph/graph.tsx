import { memo, useMemo, Fragment } from 'react'

import { cn } from '@cads/shared/lib/utils'
import { clamp } from '@cads/shared/lib/clamp'
import { createPoint, pathToSvgPath, pointsToCatmullRom } from './geometry'
import { useViewport } from './use-viewport'
import { formatNumber } from '@cads/shared/lib/format-number'

export function Graph({
  dataPoints,
  pointStyle = 'circle',
  viewportX,
  viewportY,
  bands,
  lines,
  className,
  hideLegend = false,
  formatY = formatNumber,
}: {
  dataPoints?: {
    position: [number, number]
    className?: string
  }[]
  pointStyle?: 'circle' | 'bar'
  viewportX?: [number, number]
  viewportY?: [number, number] | [number]
  bands?: { points: [number, [number, number]][]; className?: string }[] // [x, [y_lower, y_upper]] band coordiante
  lines?: [number, number][][]
  className?: string
  hideLegend?: boolean
  formatY?: (value: number) => string
}) {
  'use no memo'

  const {
    minY,
    barWidth,
    viewboxX,
    viewboxY,
    viewboxWidth,
    viewboxHeight,
    flipY,
    valueRangeY,
  } = useViewport(dataPoints, bands, lines, viewportX, viewportY, pointStyle)

  const yTickMin = clamp(minY, viewboxY, pointStyle === 'bar' ? 0 : Infinity)
  const yTickMax = Math.min(minY + valueRangeY, viewboxY + viewboxHeight)

  const yTickValues = Array.from({ length: 5 }).map((_, index) => {
    const y = (index / 4) * (yTickMax - yTickMin) + yTickMin
    return {
      value: y,
      label: y.toFixed(2),
    }
  })

  return (
    <div
      className={cn(
        'bg-muted group/graph grid h-48 w-full grid-cols-[var(--col-1)_1fr]',
        className,
      )}
      style={{
        ['--col-1' as string]: hideLegend ? '0px' : 'auto',
      }}
    >
      <aside className="relative grid overflow-hidden group-has-[button:hover]/graph:opacity-10">
        {!hideLegend &&
          yTickValues.map(({ value }, index) => {
            const estLabelHeight = '16px'
            const top = `clamp(1px, calc(${((flipY(value) - viewboxY) / viewboxHeight) * 100}% - ${estLabelHeight} / 2), calc(100% - ${estLabelHeight}))`
            return (
              <span
                className="text-muted-foreground relative col-start-1 row-start-1 ml-auto mr-0 block h-min pl-2 pr-4 font-mono text-xs"
                key={index}
                style={{ top }}
              >
                {formatY(value)}
              </span>
            )
          })}
      </aside>

      <div className="relative">
        {/* Instead of calculating the flipped y coordinate, we just mirror the svg */}
        <svg
          viewBox={`${viewboxX} ${viewboxY} ${viewboxWidth} ${viewboxHeight}`}
          className="absolute block h-full w-full -scale-y-100 will-change-transform"
          preserveAspectRatio="none"
        >
          {!hideLegend && (
            <g>
              <line
                x1={viewboxX}
                y1={0}
                x2={viewboxX + viewboxWidth}
                y2={0}
                strokeDasharray="5 5"
                className="stroke-muted stroke-[1px]"
                vectorEffect="non-scaling-stroke"
              />

              {/* Warning: using  a <line> will come with unexpected behavior when the line starts at x < 0 and is too long */}
              {yTickValues.map(({ value }, index) => (
                <path
                  d={`M${viewboxX} ${value} L${viewboxX + viewboxWidth} ${value}`}
                  key={index}
                  className="stroke-muted-foreground opacity-50"
                  strokeWidth={0.2}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          )}

          {lines?.map((line, index) => <LineMemo points={line} key={index} />)}

          {bands?.map((band, index) => <Band {...band} key={index} />)}

          {pointStyle === 'bar' &&
            dataPoints?.map(({ position }, index) => (
              <DataPoint key={index} position={position} barWidth={barWidth} />
            ))}
        </svg>

        <div className="absolute inset-0">
          {dataPoints?.map(({ position: [x, y], className }, index) => {
            if (x < viewboxX || x > viewboxWidth + viewboxX) return null
            const left = `${((x - viewboxX) / viewboxWidth) * 100}%`
            const top = `${((flipY(y) - viewboxY) / viewboxHeight) * 100}%`

            return (
              <Fragment key={index}>
                <button
                  className="absolute bottom-0 h-full w-5 -translate-x-1/2 [&:hover+span+svg+span]:opacity-100 [&:hover+span+svg]:opacity-100 [&:hover+span]:scale-150 [&:hover+span]:opacity-100"
                  style={{ left }}
                />

                <span
                  className={cn(
                    'outline-primary pointer-events-none absolute aspect-square h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white outline outline-2',
                    hideLegend && 'bg-primary h-1 outline-0',
                    pointStyle === 'bar' && 'opacity-0',
                    className,
                  )}
                  style={{ left, top }}
                />

                {!hideLegend && (
                  <svg
                    viewBox="0 0 100 2"
                    className="pointer-events-none absolute left-0 h-3 w-full opacity-0"
                    preserveAspectRatio="none"
                    style={{ top }}
                  >
                    <line
                      x1={0}
                      y1={0}
                      x2={100}
                      y2={0}
                      className="stroke-foreground opacity-80"
                      strokeLinecap="round"
                      strokeWidth={2}
                      strokeDasharray="8 8"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                )}

                {!hideLegend && (
                  <span
                    className="text-foreground absolute right-[calc(100%+1rem)] -translate-y-1/2 font-mono text-xs opacity-0"
                    style={{ top }}
                  >
                    {formatY(y)}
                  </span>
                )}
              </Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DataPoint({
  position: [x, y],
  barWidth,
}: {
  position: [number, number]
  barWidth: number
}) {
  return (
    <rect
      x={x - barWidth / 2}
      y={0}
      width={barWidth}
      height={y}
      className="fill-primary"
    />
  )
}

function Line({ points }: { points: [number, number][] }) {
  'use no memo'
  const d = useMemo(
    () =>
      pathToSvgPath(
        pointsToCatmullRom(
          points.map(([x, y]) => createPoint(x, y)),
          {
            tension: 0.5,
            divisions: clamp(points.length * 2, 5, 200),
            closed: false,
          },
        ),
      ),
    [points],
  )

  return (
    <path
      d={d}
      className="stroke-primary fill-transparent stroke-2"
      vectorEffect="non-scaling-stroke"
    />
  )
}

const LineMemo = memo(Line, (prevProps, nextProps) => {
  return prevProps.points === nextProps.points
})

function Band({
  points,
  className,
}: {
  points: [number, [number, number]][]
  className?: string
}) {
  'use no memo'
  const d = useMemo(() => {
    const upperPoints = points.map(([x, [y]]) => createPoint(x, y))
    const lowerPoints = points.map(([x, [, y]]) => createPoint(x, y))
    lowerPoints.reverse()
    const path = [
      ...pointsToCatmullRom(upperPoints, {
        tension: 0.5,
        divisions: Math.max(50, points.length * 2),
        closed: false,
      }),
      ...pointsToCatmullRom(lowerPoints, {
        tension: 0.5,
        divisions: Math.max(50, points.length * 2),
        closed: false,
      }),
    ]
    return pathToSvgPath(path)
  }, [points])

  return <path d={d} className={cn('fill-primary/20', className)} />
}

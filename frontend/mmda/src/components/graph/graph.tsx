import { useState, useMemo, Fragment } from 'react'

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
    label?: string
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
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
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

  const pointsWithinViewport = dataPoints?.filter(
    ({ position: [x] }) => x >= viewboxX && x <= viewboxX + viewboxWidth,
  )
  const highlightPoint =
    hoverIndex === null ? null : (dataPoints?.[hoverIndex] ?? null)

  return (
    <div
      className={cn(
        'bg-muted group/graph grid h-48 w-full grid-cols-[var(--col-1)_1fr] grid-rows-[1fr_min-content]',
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

              <line
                x1={viewboxX}
                y1={0}
                x2={viewboxX + viewboxWidth}
                y2={0}
                className="stroke-foreground stroke-[1px] opacity-50"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}

          {lines?.map((line, index) => <Line points={line} key={index} />)}

          {bands?.map((band, index) => <Band {...band} key={index} />)}
        </svg>

        <div className="absolute inset-0">
          {dataPoints?.map(({ position: [x, y], className }, index) => {
            if (x < viewboxX || x > viewboxWidth + viewboxX) return null
            const left = `${((x - viewboxX) / viewboxWidth) * 100}%`
            const top = `${((flipY(y) - viewboxY) / viewboxHeight) * 100}%`

            const scaledBarWidth = (barWidth / viewboxWidth) * 100
            // rounding up prevents rendering issues in Firefox that shift the bar slightly along the y axis
            const relativeHeight = Math.ceil((y / viewboxHeight) * 100)
            const bottom = `${-viewboxY / viewboxHeight}%`

            return (
              <Fragment key={index}>
                <button
                  className={cn(
                    'absolute bottom-0 h-full w-5 -translate-x-1/2 [&:hover+span+svg+span]:opacity-100 [&:hover+span+svg]:opacity-100 [&:hover+span]:z-10 [&:hover+span]:opacity-100',
                    pointStyle === 'circle' && '[&:hover+span]:scale-150',
                    pointStyle === 'bar' &&
                      'min-w-1 [&:hover+span]:bg-blue-800',
                  )}
                  onMouseOver={() => setHoverIndex(index)}
                  onMouseLeave={() => setHoverIndex(null)}
                  style={{
                    left,
                    width:
                      pointStyle === 'bar' ? `${scaledBarWidth}%` : undefined,
                  }}
                />

                <span
                  className={cn(
                    'pointer-events-none absolute',
                    hideLegend && 'bg-primary h-1 outline-0',
                    pointStyle === 'circle' &&
                      'outline-primary aspect-square h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white outline outline-2',
                    pointStyle === 'circle' && hideLegend && 'h-1 outline-1',
                    pointStyle === 'bar' &&
                      'bg-primary min-w-1 -translate-x-1/2 rounded-t-sm',
                    pointStyle === 'bar' &&
                      scaledBarWidth < 0.5 &&
                      'rounded-none',
                    className,
                  )}
                  style={{
                    left,
                    bottom,
                    top: pointStyle === 'circle' ? top : undefined,
                    width:
                      pointStyle === 'bar' ? `${scaledBarWidth}%` : undefined,
                    height:
                      pointStyle === 'bar' ? `${relativeHeight}%` : undefined,
                  }}
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

      {!hideLegend && (
        <article className="text-muted-foreground relative col-start-2 flex h-6 justify-between pt-2 font-mono text-xs leading-none">
          {pointsWithinViewport?.map(({ position: [x], label }, index) => {
            const itemsPerViewport = 15
            // filter out all points except every nth item
            if (
              index %
                Math.ceil(pointsWithinViewport.length / itemsPerViewport) !==
                0 &&
              index !== pointsWithinViewport.length - 1 &&
              pointsWithinViewport.length > 6
            ) {
              return null
            }
            const left = ((x - viewboxX) / viewboxWidth) * 100
            return (
              <span
                key={index}
                className={cn(
                  'absolute transition-opacity',
                  hoverIndex !== null && 'opacity-10',
                )}
                style={{
                  left: `${left}%`,
                  translate:
                    index === 0
                      ? undefined
                      : index === pointsWithinViewport.length - 1
                        ? '-100% 0'
                        : '-50% 0',
                }}
              >
                {label ? label : x}
              </span>
            )
          })}

          {highlightPoint && (
            <span
              className="text-foreground absolute"
              style={{
                left: `${((highlightPoint.position[0] - viewboxX) / viewboxWidth) * 100}%`,
                translate: '-50% 0',
              }}
            >
              {highlightPoint.label
                ? highlightPoint.label
                : formatNumber(highlightPoint.position[0])}
            </span>
          )}
        </article>
      )}
    </div>
  )
}

function Line({ points }: { points: [number, number][] }) {
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
